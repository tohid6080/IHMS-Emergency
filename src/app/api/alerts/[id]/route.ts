import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/server-auth'

// GET /api/alerts/[id] — جزئیات کامل هشدار (پایش زنده)
export const GET = requireAuth(async (user, _req, ctx) => {
  const { id } = await ctx.params
  const alert = await db.alert.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      project: { select: { id: true, name: true, location: true } },
      reportedBy: { select: { id: true, fullName: true, jobTitle: true, phone: true } },
      deliveries: {
        include: {
          user: {
            select: { id: true, fullName: true, jobTitle: true, phone: true, role: true, groups: { include: { group: { select: { name: true, kind: true } } } } },
          },
        },
      },
      acknowledgments: { select: { userId: true, acknowledgedAt: true, mutedAt: true } },
    },
  })
  if (!alert) return NextResponse.json({ error: 'هشدار یافت نشد' }, { status: 404 })

  const ackMap = new Map(alert.acknowledgments.map((a) => [a.userId, a]))
  const recipients = alert.deliveries.map((d) => {
    const ack = ackMap.get(d.userId)
    return {
      id: d.user.id,
      fullName: d.user.fullName,
      jobTitle: d.user.jobTitle,
      phone: d.user.phone,
      role: d.user.role,
      groups: d.user.groups.map((gm) => gm.group.name),
      ackAt: ack?.acknowledgedAt || null,
      mutedAt: ack?.mutedAt || null,
    }
  })

  return NextResponse.json({
    alert: {
      id: alert.id,
      code: alert.code,
      type: alert.type,
      level: alert.level,
      title: alert.title,
      location: alert.location,
      description: alert.description,
      instructions: alert.instructions,
      status: alert.status,
      createdAt: alert.createdAt,
      endedAt: alert.endedAt,
      project: alert.project,
      reportedBy: alert.reportedBy,
      isMine: alert.reportedById === user.id,
      canEnd: alert.reportedById === user.id || user.role !== 'USER',
    },
    recipients,
    ackCount: recipients.filter((r) => r.ackAt).length,
    targetCount: recipients.length,
  })
})
