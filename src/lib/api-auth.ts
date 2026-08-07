/**
 * api-auth.ts - request scoping for the voice-monitoring routes.
 *
 * READ THIS BEFORE RELYING ON IT.
 *
 * Every other API route in this app is completely open: GET /api/orders returns
 * every education order in the database with the patient record attached, and
 * nothing checks who is asking. That is already too loose for rehab exercises.
 * For oncology surveillance data - voice recordings and red-flag symptoms tied
 * to a named patient - it is not acceptable, so the voice routes do not follow
 * that precedent.
 *
 * What this module IS: a signed, httpOnly, same-site cookie that binds a request
 * to one patient record, so a session cannot read or write another patient's
 * data, plus a separate clinician role gated on a server-side secret.
 *
 * What this module IS NOT: authentication. The patient session is issued against
 * an MRN, and an MRN is knowable - it is printed on paperwork. Anyone who has
 * one can mint a session for it. This bounds accidental cross-patient access and
 * makes every request attributable; it does not stop a determined impostor.
 *
 * Before any deployment holding real patient data this must be replaced with the
 * hospital's identity provider or ABHA-based auth. The AbhaConsentPanel already
 * models the consent side of that. Tracked as a known gap, deliberately visible
 * rather than papered over.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'id-voice-session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type SessionRole = 'patient' | 'clinician';

export interface Session {
  role: SessionRole;
  /** PatientRef.id for a patient session; absent for a clinician. */
  patientRefId?: string;
  /** Practitioner HPR ID for a clinician session. */
  practitionerId?: string;
  expiresAt: number;
}

/**
 * Signing secret, resolved on first use rather than at module load.
 *
 * Lazy on purpose: `next build` collects page data with NODE_ENV=production, so
 * a module-scope check would make the build itself demand a runtime secret.
 * Failing at the first signed request instead keeps the requirement real
 * without coupling deploys to build machines holding production secrets.
 *
 * Refuses to fall back to a hardcoded default - a predictable secret makes the
 * signature decorative. In development an ephemeral secret is generated, so
 * sessions do not survive a restart. That is an inconvenience, not a silent
 * security hole.
 */
let cachedSecret: string | null = null;

function secret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.VOICE_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = fromEnv;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('VOICE_SESSION_SECRET must be set to at least 32 characters in production.');
  } else {
    cachedSecret = randomBytes(32).toString('hex');
  }
  return cachedSecret as string;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Constant-time compare, and length-check first since timingSafeEqual throws
  // on a mismatch rather than returning false.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (typeof session.expiresAt !== 'number' || session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookie(session: Session): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeSession(session)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function clearedCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function newSession(
  role: SessionRole,
  ids: { patientRefId?: string; practitionerId?: string },
): Session {
  return { role, ...ids, expiresAt: Date.now() + SESSION_TTL_MS };
}

/* --------------------------------------------------------------- guards */

export function readSession(request: Request): Session | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return decodeSession(match?.slice(SESSION_COOKIE.length + 1));
}

export interface Denial {
  status: number;
  error: string;
}

/**
 * Resolve the patient a request may act on.
 *
 * A patient session is pinned to its own record and may not name another. A
 * clinician session must name one explicitly, so a clinician read is always
 * scoped rather than returning the whole table.
 */
export function resolvePatientScope(
  request: Request,
  requestedPatientRefId?: string | null,
): { patientRefId: string; session: Session } | Denial {
  const session = readSession(request);
  if (!session) return { status: 401, error: 'No active session.' };

  if (session.role === 'patient') {
    if (!session.patientRefId) return { status: 401, error: 'Session has no patient binding.' };
    if (requestedPatientRefId && requestedPatientRefId !== session.patientRefId) {
      return { status: 403, error: 'This session cannot access another patient record.' };
    }
    return { patientRefId: session.patientRefId, session };
  }

  if (!requestedPatientRefId) {
    return { status: 400, error: 'A clinician request must name a patient.' };
  }
  return { patientRefId: requestedPatientRefId, session };
}

export function requireClinician(request: Request): Session | Denial {
  const session = readSession(request);
  if (!session) return { status: 401, error: 'No active session.' };
  if (session.role !== 'clinician') return { status: 403, error: 'Clinician role required.' };
  return session;
}

export function isDenial(value: unknown): value is Denial {
  return typeof value === 'object' && value !== null && 'status' in value && 'error' in value;
}
