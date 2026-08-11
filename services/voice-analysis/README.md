# voice-analysis sidecar

Praat-native acoustic parameters for the voice recovery pipeline, via
[parselmouth](https://github.com/YannickJadoul/Parselmouth) - a binding onto
the real Praat C code, not a reimplementation. Computes CPPS, HNR, shimmer
(local %, local dB), LTAS slope/tilt, and median F0 for a WAV recording.

## Why this exists

The main app's TypeScript DSP (`src/lib/voice-dsp.ts`) does its own CPPS, MPT
and DDK on-device, in-browser, for real-time feedback and offline use. This
service does not replace that. It exists because AVQI/ABI-style acoustic
indices are only meaningful if their inputs were computed the way the
literature computed them - by Praat itself - and a TypeScript port could not
honestly claim that.

## What this does NOT do

**It does not compute a composite AVQI or ABI score.** Those are published
linear-regression formulas over the six parameters this service measures.
During development, two candidate formulas for AVQI v03.01 were found from
secondary sources and neither reproduced the one verified worked example
available (Maryn's own primer, Fig. 3). Rather than guess, `/analyze` returns
the six measured parameters with `avqi: null` and an explicit
`avqiUnavailableReason`. See the module docstring in `main.py` for exactly
what is needed to turn this on for real: the primary paper's exact
coefficients, cross-checked against a worked example, not a value pulled from
memory or a summary article.

The LTAS slope/tilt calculation is a standard linear regression over the
long-term average spectrum - a defensible approximation, but not a verified
byte-for-byte match to Maryn & Weenink's original Praat script, which was not
available to cross-check in this session.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload --port 8100
```

## Test

```bash
python3 test_smoke.py
```

Verifies the parselmouth call chain runs end-to-end and responds in the right
direction to signal degradation (lower CPPS/HNR, higher shimmer). It does
**not** validate absolute values against Praat's GUI on a reference
recording - that contract test (real WAV through both Praat and this service,
asserting numeric agreement) is the remaining verification step before any
number from this service is used clinically. See the main plan's Verification
section.

## API

`POST /analyze` - multipart file upload, WAV only (uncompressed; a lossy
upload is rejected, matching `voice-capture.ts`'s reasoning in the main app).
Returns `VoiceParameters` (see `main.py`). Stateless - the file is processed
in a temp path and deleted before the response is sent; no persistence here.

`GET /health` - liveness check.
