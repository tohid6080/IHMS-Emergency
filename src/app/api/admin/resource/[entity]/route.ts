import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

function sha(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

const ENTITIES = ['users', 'groups', 'projects', 'codes', 'contacts'] as const

// GET /api/admin/resource/[entity] — لیست کامل
export const GET = requireAdmin(async (user, _req, ctx) => {
  const { entity } = await ctx.params
  if (!ENTITIES.includes(entity as (typeof ENTITIES)[number]))
    return NextResponse.json({ error: 'entity نامعتبر' }, { status: 400 })

  const orgId = user.organizationId
  switch (entity) {
    case 'users': {
      const users = await db.user.findMany({
        where: { organizationId: orgId },
        include: {
          projects: { include: { project: { select: { name: true } } } },
          groups: { include: { group: { select: { name: true, kind: true } } } },
          codes: { select: { code: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json({
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          jobTitle: u.jobTitle,
          personnelCode: u.personnelCode,
          phone: u.phone,
          email: u.email,
          role: u.role,
          accessLevel: u.accessLevel,
          canActivate: u.canActivate,
          isActive: u.isActive,
          projects: u.projects.map((p) => ({ id: p.projectId, name: p.project.name })),
          groups: u.groups.map((g) => ({ id: g.groupId, name: g.group.name, kind: g.group.kind })),
          codes: u.codes.map((c) => c.code),
        })),
      })
    }
    case 'groups': {
      const groups = await db.group.findMany({
        where: { organizationId: orgId },
        include: { members: { include: { user: { select: { id: true, fullName: true, jobTitle: true, phone: true } } } } },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json({ groups })
    }
    case 'projects': {
      const projects = await db.project.findMany({
        where: { organizationId: orgId },
        include: {
          users: { include: { user: { select: { id: true, fullName: true } } } },
          _count: { select: { alerts: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json({ projects })
    }
    case 'codes': {
      const codes = await db.activationCode.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ codes })
    }
    case 'contacts': {
      const contacts = await db.contact.findMany({
        where: { organizationId: orgId },
        include: { project: { select: { name: true } } },
        orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      })
      return NextResponse.json({ contacts })
    }
  }
  return NextResponse.json({ error: 'not found' }, { status: 404 })
})

// POST /api/admin/resource/[entity] — ایجاد
export const POST = requireAdmin(async (user, req, ctx) => {
  const { entity } = await ctx.params
  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 })
  const orgId = user.organizationId

  try {
    switch (entity) {
      case 'users': {
        if (!b.username || !b.fullName || !b.password)
          return NextResponse.json({ error: 'نام کاربری، نام کامل و رمز الزامی است' }, { status: 400 })
        const exists = await db.user.findUnique({ where: { username: b.username.trim().toLowerCase() } })
        if (exists) return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده است' }, { status: 409 })
        const count = await db.user.count({ where: { organizationId: orgId, isActive: true } })
        const org = await db.organization.findUnique({ where: { id: orgId } })
        if (org && count >= org.maxUsers)
          return NextResponse.json({ error: `سقف کاربران اشتراک (${org.maxUsers} نفر) پر شده است` }, { status: 403 })
        const u = await db.user.create({
          data: {
            organizationId: orgId,
            username: b.username.trim().toLowerCase(),
            password: sha(b.password),
            fullName: b.fullName,
            jobTitle: b.jobTitle || null,
            personnelCode: b.personnelCode || null,
            phone: b.phone || null,
            email: b.email || null,
            role: b.role || 'USER',
            accessLevel: b.accessLevel || 'USER',
            canActivate: !!b.canActivate,
          },
        })
        if (Array.isArray(b.projectIds) && b.projectIds.length) {
          await db.userProject.createMany({
            data: b.projectIds.map((pid: string) => ({ userId: u.id, projectId: pid })),
          })
        }
        if (Array.isArray(b.groupIds) && b.groupIds.length) {
          await db.groupMember.createMany({
            data: b.groupIds.map((gid: string) => ({ userId: u.id, groupId: gid })),
          })
        }
        return NextResponse.json({ ok: true, id: u.id })
      }
      case 'groups': {
        if (!b.name) return NextResponse.json({ error: 'نام گروه الزامی است' }, { status: 400 })
        const g = await db.group.create({
          data: {
            organizationId: orgId,
            name: b.name,
            kind: b.kind || 'CUSTOM',
            description: b.description || null,
            color: b.color || '#db2777',
            isSystem: false,
          },
        })
        if (Array.isArray(b.memberIds) && b.memberIds.length) {
          await db.groupMember.createMany({
            data: b.memberIds.map((uid: string) => ({ groupId: g.id, userId: uid })),
          })
        }
        return NextResponse.json({ ok: true, id: g.id })
      }
      case 'projects': {
        if (!b.name) return NextResponse.json({ error: 'نام پروژه الزامی است' }, { status: 400 })
        const p = await db.project.create({
          data: {
            organizationId: orgId,
            name: b.name,
            location: b.location || null,
            description: b.description || null,
          },
        })
        if (Array.isArray(b.userIds) && b.userIds.length) {
          await db.userProject.createMany({
            data: b.userIds.map((uid: string) => ({ userId: uid, projectId: p.id })),
          })
        }
        return NextResponse.json({ ok: true, id: p.id })
      }
      case 'codes': {
        const code = (b.code && String(b.code).trim().toUpperCase()) || `IHMS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
        const exists = await db.activationCode.findUnique({ where: { code } })
        if (exists) return NextResponse.json({ error: 'این کد قبلاً تولید شده است' }, { status: 409 })
        const c = await db.activationCode.create({
          data: {
            organizationId: orgId,
            code,
            label: b.label || null,
            userId: b.userId || null,
            role: b.role || 'USER',
            canActivate: !!b.canActivate,
            expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
          },
        })
        return NextResponse.json({ ok: true, id: c.id, code: c.code })
      }
      case 'contacts': {
        if (!b.name || !b.phone) return NextResponse.json({ error: 'نام و تلفن الزامی است' }, { status: 400 })
        const c = await db.contact.create({
          data: {
            organizationId: orgId,
            name: b.name,
            title: b.title || '',
            phone: b.phone,
            phone2: b.phone2 || null,
            email: b.email || null,
            category: b.category || 'OTHER',
            isEmergency: !!b.isEmergency,
            projectId: b.projectId || null,
            priority: Number(b.priority) || 0,
          },
        })
        return NextResponse.json({ ok: true, id: c.id })
      }
    }
  } catch (e) {
    console.error('admin create error', e)
    return NextResponse.json({ error: 'خطا در ایجاد رکورد' }, { status: 500 })
  }
  return NextResponse.json({ error: 'entity نامعتبر' }, { status: 400 })
})
