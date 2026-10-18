import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

export const GET = requireAdmin(async (user) => {
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    include: { _count: { select: { users: true, projects: true, groups: true, alerts: true } } },
  })
  return NextResponse.json({ org })
})

// PUT — تمدید/ویرایش اشتراک و اطلاعات سازمان
export const PUT = requireAdmin(async (user, req) => {
  const b = await req.json()
  const org = await db.organization.findUnique({ where: { id: user.organizationId } })
  if (!org) return NextResponse.json({ error: 'سازمان یافت نشد' }, { status: 404 })
  await db.organization.update({
    where: { id: org.id },
    data: {
      name: b.name ?? org.name,
      plan: b.plan ?? org.plan,
      maxUsers: b.maxUsers !== undefined ? Number(b.maxUsers) : org.maxUsers,
      isActive: b.isActive ?? org.isActive,
      ...(b.subscriptionEndsAt ? { subscriptionEndsAt: new Date(b.subscriptionEndsAt) } : {}),
    },
  })
  return NextResponse.json({ ok: true })
})
