import { NextResponse } from 'next/server';

/**
 * Proxy to the services/voice-analysis Python sidecar (parselmouth/Praat).
 * Kept server-side rather than called directly from the browser so the
 * sidecar's address is never exposed to the client and never needs CORS
 * configuration of its own.
 *
 * The sidecar computes real Praat measurements (CPPS, HNR, shimmer, LTAS
 * slope/tilt) but deliberately returns avqi/abi as null - see
 * services/voice-analysis/main.py's module docstring for why. This route does
 * not add a composite score either; it passes the sidecar's response through.
 *
 * If the sidecar is unreachable, this returns a well-formed "unavailable"
 * response rather than a 500, so a passage recording can still be submitted
 * for the audiologist to review manually while the automated Praat layer is
 * degraded - the same graceful-degradation pattern as the rest of this
 * pipeline (see MAX_USABLE_NOISE_FLOOR_DB / qualityFlags upstream).
 */

const SIDECAR_URL = process.env.VOICE_SIDECAR_URL || 'http://localhost:8100';
const TIMEOUT_MS = 15000;

const UNAVAILABLE = {
  available: false,
  durationSec: null,
  f0MedianHz: null,
  cppsDb: null,
  hnrDb: null,
  shimmerLocalPct: null,
  shimmerLocalDb: null,
  ltasSlopeDb: null,
  ltasTiltDb: null,
  avqi: null,
  avqiUnavailableReason: 'sidecar_unreachable',
  abi: null,
  abiUnavailableReason: 'sidecar_unreachable',
};

export async function POST(request: Request) {
  try {
    const incomingForm = await request.formData();
    const file = incomingForm.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 });
    }

    const forward = new FormData();
    forward.append('file', file, 'passage.wav');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const upstream = await fetch(`${SIDECAR_URL}/analyze`, {
        method: 'POST',
        body: forward,
        signal: controller.signal,
      });

      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        return NextResponse.json({ success: true, ...UNAVAILABLE, error: detail || `sidecar returned ${upstream.status}` });
      }

      const parsed = await upstream.json();
      return NextResponse.json({ success: true, available: true, ...parsed });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    // Sidecar down, DNS failure, timeout, etc. - never fail the caller's
    // submission over this; the manual review path still works without it.
    return NextResponse.json({ success: true, ...UNAVAILABLE, error: err?.message ?? 'unknown error' });
  }
}
