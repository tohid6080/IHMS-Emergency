// ارسال رویداد به سرویس Socket.io (mini service) به‌صورت داخلی
import { IHMS_SECRET } from '@/lib/session'

const SOCKET_EMIT_URL = process.env.IHMS_SOCKET_URL || 'http://127.0.0.1:3004'

export interface SocketEmitPayload {
  room: string // مثل org:xxxxx
  event: string // alert:new / alert:ack / alert:mute / alert:end
  data: unknown
}

export async function emitToRoom(room: string, event: string, data: unknown): Promise<void> {
  try {
    await fetch(`${SOCKET_EMIT_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, event, data, secret: IHMS_SECRET } satisfies SocketEmitPayload & { secret: string }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (e) {
    console.error('[emitToRoom] failed:', event, e)
  }
}
