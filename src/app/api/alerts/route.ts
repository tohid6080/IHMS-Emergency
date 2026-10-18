import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthedUser } from '@/lib/server-auth'
import { emitToRoom } from '@/lib/emit'
import { isIncidentType, isAlertLevel, SMART_DISPATCH, INCIDENT_TYPES, ALERT_LEVELS } from '@/lib/constants'

function alertCode(): string {
  return `EM-${Math.floor(1000 + Math.random() * 9000)}`
}

// GET /api/alerts?scope=active|history
export const GET = requireAuth(async (user, req) => {
  const scope = req.nextUrl.searchParams.get('scope') || 'active'

  if (scope === 'active') {
    // هشدارهای فعال: گیرنده باشم یا گزارش‌دهنده یا ادمین
    const myProjectIds = user.projects.map((p) => p.id)
    const alerts = await db.alert.findMany({
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
        project: { select: { name: true, location: true } },
        reportedBy: { select: { fullName: true, jobTitle: true } },
        acknowledgments: { select: { userId: true, acknowledgedAt: true, mutedAt: true } },
        deliveries: { select: { userId: true } },
        _count: { select: { acknowledgments: true, deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        code: a.code,
        type: a.type,
        level: a.level,
        title: a.title,
        location: a.location,
        description: a.description,
        instructions: a.instructions,
        status: a.status,
        createdAt: a.createdAt,
        projectId: a.projectId,
        project: a.project,
        reportedBy: a.reportedBy,
        isMine: a.reportedById === user.id,
        targetCount: a._count.deliveries,
        ackCount: a._count.acknowledgments,
        myAck: a.acknowledgments.find((x) => x.userId === user.id) || null,
        isTarget: a.deliveries.some((d) => d.userId === user.id),
      })),
    })
  }

  // history: هشدارهای پایان‌یافته پروژه‌های مجاز من
  const myProjectIds = user.projects.map((p) => p.id)
  const alerts = await db.alert.findMany({
    where: {
      organizationId: user.organizationId,
      status: { in: ['ENDED', 'CANCELLED'] },
      ...(user.role === 'ADMIN'
        ? {}
        : myProjectIds.length
          ? { projectId: { in: myProjectIds } }
          : { reportedById: user.id }),
    },
    include: {
      project: { select: { name: true } },
      reportedBy: { select: { fullName: true } },
      _count: { select: { acknowledgments: true, deliveries: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      code: a.code,
      type: a.type,
      level: a.level,
      title: a.title,
      location: a.location,
      status: a.status,
      createdAt: a.createdAt,
      endedAt: a.endedAt,
      project: a.project,
      reportedBy: a.reportedBy,
      targetCount: a._count.deliveries,
      ackCount: a._count.acknowledgments,
      durationMin: a.endedAt ? Math.round((a.endedAt.getTime() - a.createdAt.getTime()) / 60000) : null,
    })),
  })
})

// POST /api/alerts — فعال‌سازی شرایط اضطراری + اطلاع‌رسانی هوشمند
export const POST = requireAuth(async (user: AuthedUser, req: NextRequest) => {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 })

  const { type, level, projectId, title, location, description, instructions, targetGroups } = body
  if (!isIncidentType(type)) return NextResponse.json({ error: 'نوع حادثه نامعتبر است' }, { status: 400 })
  if (!isAlertLevel(level)) return NextResponse.json({ error: 'سطح حادثه نامعتبر است' }, { status: 400 })
  if (!title || !location || !projectId)
    return NextResponse.json({ error: 'عنوان، محل وقوع و پروژه الزامی است' }, { status: 400 })

  // مجوز فعال‌سازی
  if (!user.canActivate && user.role === 'USER') {
    return NextResponse.json({ error: 'شما مجوز فعال‌سازی شرایط اضطراری ندارید' }, { status: 403 })
  }
  // پروژه باید مجاز باشد
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId, isActive: true },
  })
  if (!project) return NextResponse.json({ error: 'پروژه یافت نشد یا مجاز نیست' }, { status: 403 })

  // ─── اطلاع‌رسانی هوشمند: تعیین گیرندگان ───
  // گروه‌های انتخابی یا پیش‌فرض بر اساس نوع حادثه
  let groupIds: string[] = Array.isArray(targetGroups) ? targetGroups.filter((g: unknown) => typeof g === 'string') : []
  if (groupIds.length === 0) {
    const kinds = SMART_DISPATCH[type]
    const groups = await db.group.findMany({
      where: { organizationId: user.organizationId, kind: { in: kinds } },
    })
    groupIds = groups.map((g) => g.id)
  }

  const selectedGroups = await db.group.findMany({
    where: { id: { in: groupIds }, organizationId: user.organizationId },
    include: { members: { select: { userId: true } } },
  })

  const targetIdSet = new Set<string>()
  const hasAllGroup = selectedGroups.some((g) => g.kind === 'ALL')

  if (hasAllGroup) {
    // کلیه پرسنل فعالِ پروژه مربوطه
    const projectUsers = await db.userProject.findMany({
      where: { projectId },
      select: { userId: true },
    })
    projectUsers.forEach((u) => targetIdSet.add(u.userId))
  }
  selectedGroups
    .filter((g) => g.kind !== 'ALL')
    .forEach((g) => g.members.forEach((m) => targetIdSet.add(m.userId)))

  // گزارش‌دهنده گیرنده محسوب نمی‌شود (خودش از طریق پایش زنده دنبال می‌کند)
  targetIdSet.delete(user.id)

  // فقط کاربران فعال سازمان
  const activeUsers = await db.user.findMany({
    where: { id: { in: Array.from(targetIdSet) }, organizationId: user.organizationId, isActive: true },
    select: { id: true },
  })
  const targetIds = activeUsers.map((u) => u.id)

  const alert = await db.alert.create({
    data: {
      organizationId: user.organizationId,
      projectId,
      code: alertCode(),
      type,
      level,
      title,
      location,
      description: description || null,
      instructions: instructions || DEFAULT_INSTRUCTIONS_PLACEHOLDER(type),
      reportedById: user.id,
      targetGroupIds: JSON.stringify(groupIds),
      status: 'ACTIVE',
    },
  })

  if (targetIds.length) {
    await db.alertDelivery.createMany({
      data: targetIds.map((uid) => ({ alertId: alert.id, userId: uid, channel: 'PUSH' })),
    })
  }

  // انتشار لحظه‌ای به کل سازمان (کلاینت خودش تشخیص می‌دهد گیرنده است یا نه)
  const payload = {
    alert: {
      id: alert.id,
      code: alert.code,
      type,
      level,
      title,
      location,
      description: alert.description,
      instructions: alert.instructions,
      createdAt: alert.createdAt,
      projectId,
      projectName: project.name,
      reportedById: user.id,
      reportedByName: user.fullName,
      reportedByTitle: user.jobTitle,
    },
    targets: targetIds,
    targetCount: targetIds.length,
  }
  await emitToRoom(`org:${user.organizationId}`, 'alert:new', payload)

  return NextResponse.json({ ok: true, alert: payload.alert, targetCount: targetIds.length })
})

function DEFAULT_INSTRUCTIONS_PLACEHOLDER(type: string): string {
  // در صورت خالی بودن دستورالعمل، متن پیش‌فرض نوع حادثه در کلاینت نمایش داده می‌شود
  return ''
}
