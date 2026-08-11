"""
Smoke test for the voice-analysis sidecar. Same spirit as scripts/test-voice.mjs
in the main app: synthetic signals with known properties, plain asserts, no
test framework. This does NOT validate CPPS/HNR/shimmer against Praat's GUI
output on a reference recording - that contract test still needs to happen
before any AVQI-style number from this service is trusted (see main.py's
module docstring). What this DOES verify: the parselmouth call chain actually
runs end-to-end without raising and returns numbers in a sane range - i.e.
that the sidecar is wired correctly, not that its output matches Praat exactly.

Run: pip install -r requirements.txt && python3 test_smoke.py
"""

import io
import math
import struct
import wave

import numpy as np
from fastapi.testclient import TestClient

from main import app, compute_cpps, compute_hnr, compute_ltas_slope_tilt, compute_shimmer, compute_f0_median
import parselmouth

SR = 44100


def synth_tone(f0_hz: float, duration_sec: float, jitter: float = 0.0, noise_db: float = -60.0) -> np.ndarray:
    """A periodic tone with a few harmonics, optional cycle-length jitter and noise floor - enough
    structure for CPPS/HNR/shimmer to have something non-degenerate to measure."""
    n = int(duration_sec * SR)
    t = np.zeros(n)
    phase = 0.0
    i = 0
    rng = np.random.default_rng(42)
    while i < n:
        period = SR / (f0_hz * (1 + rng.uniform(-jitter, jitter)))
        cycle_len = max(1, int(period))
        end = min(i + cycle_len, n)
        cycle_t = np.arange(end - i) / SR
        cycle = (
            0.6 * np.sin(2 * np.pi * f0_hz * cycle_t)
            + 0.25 * np.sin(2 * np.pi * f0_hz * 2 * cycle_t)
            + 0.1 * np.sin(2 * np.pi * f0_hz * 3 * cycle_t)
        )
        t[i:end] = cycle
        i = end
    noise_amp = 10 ** (noise_db / 20)
    t = t + rng.normal(0, noise_amp, n)
    return (t / (np.max(np.abs(t)) + 1e-9) * 0.8).astype(np.float64)


def to_wav_bytes(pcm: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        ints = np.clip(pcm * 32767, -32768, 32767).astype(np.int16)
        w.writeframes(ints.tobytes())
    return buf.getvalue()


print("--------------------------------------------------------")
print("Running voice-analysis sidecar smoke test")
print("--------------------------------------------------------\n")

print("1. Testing compute_* against a clean 150 Hz tone...")
clean = synth_tone(150, 3.0, jitter=0.0, noise_db=-70)
clean_sound = parselmouth.Sound(clean, sampling_frequency=SR)

cpps_clean = compute_cpps(clean_sound)
hnr_clean = compute_hnr(clean_sound)
shim_pct_clean, shim_db_clean = compute_shimmer(clean_sound)
slope_clean, tilt_clean = compute_ltas_slope_tilt(clean_sound)
f0_clean = compute_f0_median(clean_sound)

assert cpps_clean is not None and 0 < cpps_clean < 40, f"CPPS out of range: {cpps_clean}"
assert hnr_clean is not None and hnr_clean > 10, f"HNR too low for a clean tone: {hnr_clean}"
assert shim_pct_clean is not None and 0 <= shim_pct_clean < 5, f"shimmer% too high for a clean tone: {shim_pct_clean}"
assert f0_clean is not None and abs(f0_clean - 150) < 5, f"F0 median off target: {f0_clean}"
assert slope_clean is not None and tilt_clean is not None, "LTAS slope/tilt should be computable"
print(f"   CPPS={cpps_clean:.2f}dB HNR={hnr_clean:.2f}dB shimmer={shim_pct_clean:.2f}% F0={f0_clean:.1f}Hz")
print("   PASS: clean tone yields plausible, non-degenerate values\n")

print("2. Testing degraded signal has lower CPPS/HNR and higher shimmer than clean...")
degraded = synth_tone(150, 3.0, jitter=0.08, noise_db=-20)
degraded_sound = parselmouth.Sound(degraded, sampling_frequency=SR)
cpps_deg = compute_cpps(degraded_sound)
hnr_deg = compute_hnr(degraded_sound)
shim_pct_deg, _ = compute_shimmer(degraded_sound)

assert cpps_deg is not None and cpps_deg < cpps_clean, f"CPPS did not drop for degraded signal: {cpps_deg} vs {cpps_clean}"
assert hnr_deg is not None and hnr_deg < hnr_clean, f"HNR did not drop for degraded signal: {hnr_deg} vs {hnr_clean}"
assert shim_pct_deg is not None and shim_pct_deg > shim_pct_clean, f"shimmer did not rise for degraded signal: {shim_pct_deg} vs {shim_pct_clean}"
print(f"   degraded: CPPS={cpps_deg:.2f}dB HNR={hnr_deg:.2f}dB shimmer={shim_pct_deg:.2f}%")
print("   PASS: monotonic response to signal degradation - same direction as the JS CPPS bench\n")

print("3. Testing graceful handling of silence (no crash, sane nulls/low values)...")
silence = np.zeros(int(1.0 * SR))
silence_sound = parselmouth.Sound(silence, sampling_frequency=SR)
# Must not raise. Values may be None or degenerate; that is correct behaviour.
_ = compute_cpps(silence_sound)
_ = compute_hnr(silence_sound)
_ = compute_shimmer(silence_sound)
_ = compute_ltas_slope_tilt(silence_sound)
_ = compute_f0_median(silence_sound)
print("   PASS: silence does not raise\n")

print("4. Testing the /analyze HTTP endpoint end-to-end...")
client = TestClient(app)

wav_bytes = to_wav_bytes(clean, SR)
resp = client.post("/analyze", files={"file": ("sample.wav", wav_bytes, "audio/wav")})
assert resp.status_code == 200, f"unexpected status: {resp.status_code} {resp.text}"
body = resp.json()
assert body["cppsDb"] is not None
assert body["avqi"] is None, "AVQI must stay null until the regression is verified - see main.py docstring"
assert body["avqiUnavailableReason"] == "avqi_regression_not_verified"
print(f"   /analyze -> durationSec={body['durationSec']:.2f} cppsDb={body['cppsDb']:.2f} avqi={body['avqi']}")
print("   PASS: endpoint responds, and refuses to fabricate a composite AVQI score\n")

print("5. Testing rejection of non-WAV upload...")
resp = client.post("/analyze", files={"file": ("sample.mp3", b"not a wav", "audio/mpeg")})
assert resp.status_code == 400, f"expected 400 for non-wav upload, got {resp.status_code}"
print("   PASS: non-WAV upload rejected\n")

print("--------------------------------------------------------")
print("All voice-analysis sidecar smoke tests passed.")
print("--------------------------------------------------------")
