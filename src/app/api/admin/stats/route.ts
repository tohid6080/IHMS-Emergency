import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

export const GET = requireAdmin(async (user) => {
  const orgId = user.organizationId
  const [totalUsers, activeUsers, totalProjects, totalGroups, totalAlerts, activeAlerts, totalAcks, recentAlerts] =
    await Promise.all([
      db.user.count({ where: { organizationId: orgId } }),
      db.user.count({ where: { organizationId: orgId, isActive: true } }),
      db.project.count({ where: { organizationId: orgId, isActive: true } }),
      db.group.count({ where: { organizationId: orgId } }),
      db.alert.count({ where: { organizationId: orgId } }),
      db.alert.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      db.acknowledgment.count({ where: { alert: { organizationId: orgId } } }),
      db.alert.findMany({
        where: { organizationId: orgId },
        include: { project: { select: { name: true } }, reportedBy: { select: { fullName: true } }, _count: { select: { acknowledgments: true, deliveries: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

  // میانگین زمان تأیید (دقیقه)
  const acks = await db.acknowledgment.findMany({
    where: { alert: { organizationId: orgId } },
    include: { alert: { select: { createdAt: true } } },
    take: 500,
  })
  const ackTimes = acks.map((a) => (a.acknowledgedAt.getTime() - a.alert.createdAt.getTime()) / 60000).filter((t) => t >= 0)
  const avgAckMin = ackTimes.length ? Math.round(ackTimes.reduce((s, t) => s + t, 0) / ackTimes.length * 10) / 10 : null

  const org = await db.organization.findUnique({ where: { id: orgId } })

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalProjects,
    totalGroups,
    totalAlerts,
    activeAlerts,
    totalAcks,
    avgAckMin,
    daysLeft: org ? Math.max(0, Math.ceil((org.subscriptionEndsAt.getTime() - Date.now()) / 86400000)) : 0,
    recentAlerts: recentAlerts.map((a) => ({
      id: a.id,
      code: a.code,
      type: a.type,
      level: a.level,
      title: a.title,
      status: a.status,
      createdAt: a.createdAt,
      project: a.project.name,
      reportedBy: a.reportedBy.fullName,
      ackCount: a._count.acknowledgments,
      targetCount: a._count.deliveries,
    })),
  })
})
