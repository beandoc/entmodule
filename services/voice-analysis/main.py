"""
voice-analysis sidecar - Praat-native acoustic parameters for the ENT module's
post-operative voice recovery pipeline.

Why a separate Python service: the six AVQI/ABI input parameters (CPPS, HNR,
shimmer local %, shimmer local dB, LTAS slope, LTAS tilt) only mean what the
literature says they mean if they were computed by Praat's own algorithms.
parselmouth is a binding onto the real Praat C code, not a reimplementation -
that is the entire reason this runs as a Python sidecar instead of a
TypeScript port. See src/lib/voice-dsp.ts in the main app for the
JavaScript-side CPPS/MPT/DDK engine this complements, not replaces.

WHAT THIS DOES NOT DO, on purpose: it does not compute a composite AVQI or ABI
score. Those are published linear-regression formulas over the six parameters
below, and getting a coefficient wrong produces a confident, clinical-looking
number that is silently incorrect - exactly the failure this whole pipeline
exists to avoid (see voice-analysis-service.ts's header comment on the
Math.random() CPPS this replaced). During development, a web search turned up
two internally inconsistent secondary-source formulas for AVQI v03.01, and
neither reproduced the one verified worked example available (Maryn & Weenink
2015/2017, Fig. 3: CPPS=9.75, HNR=15.54, ShimLocal=7.56%, ShimLocaldB=0.70,
Slope=-30.21, Tilt=-6.90 -> AVQI=5.88, albeit for the v02.04 script rather than
v03.01). Rather than ship an unverified regression, /analyze returns the six
measured parameters plus avqi=null/avqiUnavailableReason. To enable a real
composite score: obtain the primary source (Barsties & Maryn, "Objective
dysphonia measures in the program Praat: Smoothed cepstral peak prominence and
acoustic voice quality index", Journal of Voice 2015, for AVQI; the equivalent
ABI paper by Barsties v. Latoszek et al.), verify the coefficients against a
worked example, then fill in compute_avqi()/compute_abi() below and remove the
"not verified" gate. Do not fill in a formula from memory or a secondary
source without that verification step.
"""

from __future__ import annotations

import math
import os
import tempfile
from typing import Optional

import numpy as np
import parselmouth
from fastapi import FastAPI, File, HTTPException, UploadFile
from parselmouth.praat import call
from pydantic import BaseModel

app = FastAPI(
    title="voice-analysis-sidecar",
    description="Praat-native acoustic parameters (CPPS, HNR, shimmer, LTAS) via parselmouth.",
)


class VoiceParameters(BaseModel):
    durationSec: float
    f0MedianHz: Optional[float]
    cppsDb: Optional[float]
    hnrDb: Optional[float]
    shimmerLocalPct: Optional[float]
    shimmerLocalDb: Optional[float]
    ltasSlopeDb: Optional[float]
    ltasTiltDb: Optional[float]
    # Composite indices - see module docstring for why these are gated off.
    avqi: Optional[float] = None
    avqiUnavailableReason: Optional[str] = "avqi_regression_not_verified"
    abi: Optional[float] = None
    abiUnavailableReason: Optional[str] = "abi_regression_not_verified"


def _nan_to_none(value: float) -> Optional[float]:
    return None if value is None or math.isnan(value) else float(value)


def compute_cpps(sound: parselmouth.Sound) -> Optional[float]:
    """
    Smoothed cepstral peak prominence, Hillenbrand method.

    Settings confirmed against Maryn's own Praat primer (Maryn, 2017,
    "Practical Acoustics in Clinical Voice Assessment", footnote 2): subtract
    trend before smoothing = no, time averaging window = 0.01 s, quefrency
    averaging window = 0.001 s, line type = Straight. The remaining arguments
    (peak-search pitch range, tolerance, interpolation, trend-line quefrency
    range, fit method) are Praat's own conventional defaults for this command,
    not independently confirmed against Maryn's exact script in this codebase -
    if CPPS values here are compared against a published cutoff, re-verify
    those against the primary source first.
    """
    try:
        power_cepstrogram = call(sound, "To PowerCepstrogram", 60, 0.002, 5000, 50)
        cpps = call(
            power_cepstrogram, "Get CPPS",
            False,            # subtract trend before smoothing
            0.01,             # time averaging window (s)
            0.001,            # quefrency averaging window (s)
            60, 330,          # peak search pitch range (Hz)
            0.05,             # tolerance
            "Parabolic",      # interpolation
            0.001, 0.05,      # trend line quefrency range (s)
            "Straight",       # trend type
            "Robust slow",    # fit method
        )
        return _nan_to_none(cpps)
    except Exception:
        return None


def compute_hnr(sound: parselmouth.Sound) -> Optional[float]:
    """Mean harmonics-to-noise ratio, autocorrelation method, standard Praat defaults."""
    try:
        harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        hnr = call(harmonicity, "Get mean", 0, 0)
        return _nan_to_none(hnr)
    except Exception:
        return None


def compute_shimmer(sound: parselmouth.Sound) -> tuple[Optional[float], Optional[float]]:
    """
    Shimmer local (%) and local (dB), the standard parselmouth two-step pattern:
    build a glottal-pulse PointProcess, then query shimmer against [sound, pp].
    Praat's "Get shimmer (local)" returns a fraction; AVQI-literature reports it
    as a percentage, hence the *100.
    """
    try:
        point_process = call(sound, "To PointProcess (periodic, cc)", 75, 500)
        shimmer_local = call(
            [sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6,
        )
        shimmer_local_db = call(
            [sound, point_process], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6,
        )
        return _nan_to_none(shimmer_local * 100 if shimmer_local is not None else None), _nan_to_none(shimmer_local_db)
    except Exception:
        return None, None


def compute_ltas_slope_tilt(sound: parselmouth.Sound) -> tuple[Optional[float], Optional[float]]:
    """
    LTAS slope and tilt over 0-10 kHz, 1 Hz bandwidth bins.

    This is a standard linear regression of the log-magnitude long-term average
    spectrum against frequency - NOT a verified reproduction of Maryn &
    Weenink's exact Praat-script procedure for "Slope of LTAS" / "Tilt of
    trendline through LTAS" (that script's binning and detrending steps were
    not available to cross-check in this session). Treat these two values as
    a defensible approximation, not a byte-for-byte match to the AVQI
    literature's numbers, until checked against a reference recording.
    """
    try:
        ltas = call(sound, "To Ltas", 1.0)
        n_bins = call(ltas, "Get number of bins")
        freqs, db = [], []
        for i in range(1, n_bins + 1):
            f = call(ltas, "Get frequency from bin number", i)
            v = call(ltas, "Get value in bin", i)
            if f is not None and v is not None and not math.isnan(v) and 0 <= f <= 10000:
                freqs.append(f)
                db.append(v)
        if len(freqs) < 2:
            return None, None
        freqs_arr, db_arr = np.array(freqs), np.array(db)
        slope, intercept = np.polyfit(freqs_arr, db_arr, 1)
        # "Slope" here follows the AVQI convention of reporting the overall
        # spectral energy fall-off (first-bin-to-last-bin difference, dB);
        # "tilt" is the fitted regression slope scaled to dB per kHz.
        overall_slope = float(db_arr[-1] - db_arr[0])
        tilt_db_per_khz = float(slope * 1000)
        return overall_slope, tilt_db_per_khz
    except Exception:
        return None, None


def compute_f0_median(sound: parselmouth.Sound) -> Optional[float]:
    try:
        pitch = sound.to_pitch()
        f0 = call(pitch, "Get quantile", 0, 0, 0.5, "Hertz")
        return _nan_to_none(f0)
    except Exception:
        return None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=VoiceParameters)
async def analyze(file: UploadFile = File(...)):
    """
    Stateless: the WAV is written to a temp file for parselmouth to open, then
    deleted before responding. Nothing is persisted here - retention policy
    lives in the caller (see /api/voice-sessions in the main app).
    """
    if not file.filename or not file.filename.lower().endswith(".wav"):
        raise HTTPException(400, "Only uncompressed WAV is accepted. See voice-capture.ts for why lossy codecs are refused upstream.")

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(400, "Empty file.")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name

        try:
            sound = parselmouth.Sound(tmp_path)
        except Exception as exc:
            raise HTTPException(400, f"Could not read WAV file: {exc}") from exc

        duration = sound.get_total_duration()
        cpps = compute_cpps(sound)
        hnr = compute_hnr(sound)
        shimmer_local, shimmer_local_db = compute_shimmer(sound)
        ltas_slope, ltas_tilt = compute_ltas_slope_tilt(sound)
        f0_median = compute_f0_median(sound)

        return VoiceParameters(
            durationSec=duration,
            f0MedianHz=f0_median,
            cppsDb=cpps,
            hnrDb=hnr,
            shimmerLocalPct=shimmer_local,
            shimmerLocalDb=shimmer_local_db,
            ltasSlopeDb=ltas_slope,
            ltasTiltDb=ltas_tilt,
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
