import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/server-auth'
import { emitToRoom } from '@/lib/emit'

// POST /api/alerts/[id]/ack — تأیید دریافت هشدار
export const POST = requireAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params
  const alert = await db.alert.findFirst({
    where: { id, organizationId: user.organizationId, status: 'ACTIVE' },
  })
  if (!alert) return NextResponse.json({ error: 'هشدار فعال نیست' }, { status: 404 })

  const delivery = await db.alertDelivery.findUnique({
    where: { alertId_userId: { alertId: id, userId: user.id } },
  })
  if (!delivery && alert.reportedById !== user.id && user.role === 'USER') {
    return NextResponse.json({ error: 'شما گیرنده این هشدار نیستید' }, { status: 403 })
  }

  const existing = await db.acknowledgment.findUnique({
    where: { alertId_userId: { alertId: id, userId: user.id } },
  })
  const ack =
    existing ??
    (await db.acknowledgment.create({
      data: { alertId: id, userId: user.id, device: 'PWA' },
    }))

  await emitToRoom(`org:${user.organizationId}`, 'alert:ack', {
    alertId: id,
    user: { id: user.id, fullName: user.fullName, jobTitle: user.jobTitle, role: user.role },
    ackAt: ack.acknowledgedAt,
  })

  const total = await db.alertDelivery.count({ where: { alertId: id } })
  const acked = await db.acknowledgment.count({ where: { alertId: id } })
  return NextResponse.json({ ok: true, ackCount: acked, targetCount: total, ackAt: ack.acknowledgedAt })
})
