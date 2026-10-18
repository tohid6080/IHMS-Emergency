import crypto from 'crypto'

// کلید مشترک امضای توکن (بین Next و سرویس Socket)
export const IHMS_SECRET = process.env.IHMS_SECRET || 'ihms-emergency-secret-2026'
export const SESSION_COOKIE = 'ihms_token'
const DAY = 24 * 60 * 60 * 1000

export interface SessionPayload {
  uid: string
  org: string
  exp: number
  iat: number
}

function sign(data: string): string {
  return crypto.createHmac('sha256', IHMS_SECRET).update(data).digest('base64url')
}

export function createSessionToken(uid: string, org: string, days = 30): string {
  const payload: SessionPayload = {
    uid,
    org,
    exp: Date.now() + days * DAY,
    iat: Date.now(),
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  if (!body || !sig) return null
  const expected = sign(body)
  // مقایسه امن
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload.uid || !payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
