import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/server-auth'
import { emitToRoom } from '@/lib/emit'

// POST /api/alerts/[id]/end — پایان شرایط اضطراری
export const POST = requireAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params
  const alert = await db.alert.findFirst({
    where: { id, organizationId: user.organizationId, status: 'ACTIVE' },
  })
  if (!alert) return NextResponse.json({ error: 'هشدار یافت نشد یا پایان یافته است' }, { status: 404 })

  if (alert.reportedById !== user.id && user.role === 'USER') {
    return NextResponse.json({ error: 'فقط گزارش‌دهنده یا مدیر می‌تواند وضعیت را پایان دهد' }, { status: 403 })
  }

  await db.alert.update({
    where: { id },
    data: { status: 'ENDED', endedAt: new Date(), endedById: user.id },
  })

  await emitToRoom(`org:${user.organizationId}`, 'alert:end', { alertId: id, endedByName: user.fullName })

  return NextResponse.json({ ok: true })
})
