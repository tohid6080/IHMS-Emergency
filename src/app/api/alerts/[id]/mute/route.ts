import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/server-auth'
import { emitToRoom } from '@/lib/emit'

// POST /api/alerts/[id]/mute — ساکت کردن آژیر (بدون تأیید دریافت)
export const POST = requireAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params
  const alert = await db.alert.findFirst({
    where: { id, organizationId: user.organizationId, status: 'ACTIVE' },
  })
  if (!alert) return NextResponse.json({ error: 'هشدار فعال نیست' }, { status: 404 })

  const existing = await db.acknowledgment.findUnique({
    where: { alertId_userId: { alertId: id, userId: user.id } },
  })
  if (existing) {
    if (!existing.mutedAt) {
      await db.acknowledgment.update({ where: { id: existing.id }, data: { mutedAt: new Date() } })
    }
  } else {
    await db.acknowledgment.create({
      data: { alertId: id, userId: user.id, mutedAt: new Date(), device: 'PWA' },
    })
  }

  await emitToRoom(`org:${user.organizationId}`, 'alert:mute', {
    alertId: id,
    user: { id: user.id, fullName: user.fullName },
  })
  return NextResponse.json({ ok: true })
})
