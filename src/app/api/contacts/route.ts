import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/server-auth'

export const GET = requireAuth(async (user) => {
  const contacts = await db.contact.findMany({
    where: { organizationId: user.organizationId },
    include: { project: { select: { name: true } } },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ contacts })
})

export const POST = requireAdmin(async (user, req) => {
  const b = await req.json()
  if (!b.name || !b.title || !b.phone)
    return NextResponse.json({ error: 'نام، سمت و تلفن الزامی است' }, { status: 400 })
  const contact = await db.contact.create({
    data: {
      organizationId: user.organizationId,
      name: b.name,
      title: b.title,
      phone: b.phone,
      phone2: b.phone2 || null,
      email: b.email || null,
      category: b.category || 'OTHER',
      isEmergency: !!b.isEmergency,
      projectId: b.projectId || null,
      priority: Number(b.priority) || 0,
    },
  })
  return NextResponse.json({ ok: true, contact })
})
