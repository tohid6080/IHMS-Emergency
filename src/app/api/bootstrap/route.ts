import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/server-auth'

// GET /api/bootstrap — همه داده‌های اولیه اپ در یک فراخوانی
export const GET = requireAuth(async (user) => {
  const [groups, projects, contacts, activeAlerts, org] = await Promise.all([
    db.group.findMany({
      where: { organizationId: user.organizationId },
      include: { members: { include: { user: { select: { id: true, fullName: true, jobTitle: true, phone: true } } } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.project.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.contact.findMany({
      where: { organizationId: user.organizationId },
      include: { project: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    }),
    db.alert.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'ACTIVE',
        OR: [
          { deliveries: { some: { userId: user.id } } },
          { reportedById: user.id },
          ...(user.role === 'ADMIN' ? [{}] : []),
        ],
      },
      include: {
        project: { select: { name: true } },
        reportedBy: { select: { fullName: true } },
        acknowledgments: { select: { userId: true, acknowledgedAt: true } },
        deliveries: { select: { userId: true } },
        _count: { select: { acknowledgments: true, deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.organization.findUnique({ where: { id: user.organizationId } }),
  ])

  return NextResponse.json({
    user,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      description: g.description,
      color: g.color,
      isSystem: g.isSystem,
      members: g.members.map((m) => ({
        id: m.user.id,
        fullName: m.user.fullName,
        jobTitle: m.user.jobTitle,
        phone: m.user.phone,
        roleInGroup: m.roleInGroup,
      })),
    })),
    projects,
    contacts,
    activeAlerts: activeAlerts.map((a) => ({
      id: a.id,
      code: a.code,
      type: a.type,
      level: a.level,
      title: a.title,
      location: a.location,
      description: a.description,
      instructions: a.instructions,
      createdAt: a.createdAt,
      projectId: a.projectId,
      project: a.project,
      reportedBy: a.reportedBy,
      isMine: a.reportedById === user.id,
      isTarget: a.deliveries.some((d) => d.userId === user.id),
      myAck: a.acknowledgments.find((x) => x.userId === user.id) || null,
      targetCount: a._count.deliveries,
      ackCount: a._count.acknowledgments,
    })),
    subscriptionExpired: !org?.isActive || (org ? org.subscriptionEndsAt < new Date() : true),
  })
})
