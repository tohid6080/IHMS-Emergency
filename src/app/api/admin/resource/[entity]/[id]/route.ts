import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

function sha(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

const ENTITIES = ['users', 'groups', 'projects', 'codes', 'contacts'] as const

// PUT /api/admin/resource/[entity]/[id] — ویرایش
export const PUT = requireAdmin(async (user, req, ctx) => {
  const { entity, id } = await ctx.params
  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 })
  const orgId = user.organizationId

  try {
    switch (entity) {
      case 'users': {
        const target = await db.user.findFirst({ where: { id, organizationId: orgId } })
        if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })
        await db.user.update({
          where: { id },
          data: {
            fullName: b.fullName ?? target.fullName,
            jobTitle: b.jobTitle ?? target.jobTitle,
            personnelCode: b.personnelCode ?? target.personnelCode,
            phone: b.phone ?? target.phone,
            email: b.email ?? target.email,
            role: b.role ?? target.role,
            accessLevel: b.accessLevel ?? target.accessLevel,
            canActivate: b.canActivate ?? target.canActivate,
            isActive: b.isActive ?? target.isActive,
            ...(b.password ? { password: sha(b.password) } : {}),
          },
        })
        if (Array.isArray(b.projectIds)) {
          await db.userProject.deleteMany({ where: { userId: id } })
          if (b.projectIds.length)
            await db.userProject.createMany({ data: b.projectIds.map((pid: string) => ({ userId: id, projectId: pid })) })
        }
        if (Array.isArray(b.groupIds)) {
          await db.groupMember.deleteMany({ where: { userId: id, groupId: { notIn: b.groupIds } } })
          for (const gid of b.groupIds) {
            await db.groupMember.upsert({
              where: { groupId_userId: { groupId: gid, userId: id } },
              create: { groupId: gid, userId: id },
              update: {},
            })
          }
        }
        return NextResponse.json({ ok: true })
      }
      case 'groups': {
        const target = await db.group.findFirst({ where: { id, organizationId: orgId } })
        if (!target) return NextResponse.json({ error: 'گروه یافت نشد' }, { status: 404 })
        await db.group.update({
          where: { id },
          data: {
            name: b.name ?? target.name,
            kind: b.kind ?? target.kind,
            description: b.description ?? target.description,
            color: b.color ?? target.color,
          },
        })
        if (Array.isArray(b.memberIds)) {
          await db.groupMember.deleteMany({ where: { groupId: id, userId: { notIn: b.memberIds } } })
          for (const uid of b.memberIds) {
            await db.groupMember.upsert({
              where: { groupId_userId: { groupId: id, userId: uid } },
              create: { groupId: id, userId: uid },
              update: {},
            })
          }
        }
        return NextResponse.json({ ok: true })
      }
      case 'projects': {
        const target = await db.project.findFirst({ where: { id, organizationId: orgId } })
        if (!target) return NextResponse.json({ error: 'پروژه یافت نشد' }, { status: 404 })
        await db.project.update({
          where: { id },
          data: {
            name: b.name ?? target.name,
            location: b.location ?? target.location,
            description: b.description ?? target.description,
            isActive: b.isActive ?? target.isActive,
          },
        })
        if (Array.isArray(b.userIds)) {
          await db.userProject.deleteMany({ where: { projectId: id, userId: { notIn: b.userIds } } })
          for (const uid of b.userIds) {
            await db.userProject.upsert({
              where: { userId_projectId: { userId: uid, projectId: id } },
              create: { userId: uid, projectId: id },
              update: {},
            })
          }
        }
        return NextResponse.json({ ok: true })
      }
      case 'codes': {
        const target = await db.activationCode.findFirst({ where: { id, organizationId: orgId } })
        if (!target) return NextResponse.json({ error: 'کد یافت نشد' }, { status: 404 })
        await db.activationCode.update({
          where: { id },
          data: {
            label: b.label ?? target.label,
            userId: b.userId !== undefined ? b.userId : target.userId,
            role: b.role ?? target.role,
            canActivate: b.canActivate ?? target.canActivate,
            isActive: b.isActive ?? target.isActive,
            expiresAt: b.expiresAt !== undefined ? (b.expiresAt ? new Date(b.expiresAt) : null) : target.expiresAt,
          },
        })
        return NextResponse.json({ ok: true })
      }
      case 'contacts': {
        const target = await db.contact.findFirst({ where: { id, organizationId: orgId } })
        if (!target) return NextResponse.json({ error: 'مخاطب یافت نشد' }, { status: 404 })
        await db.contact.update({
          where: { id },
          data: {
            name: b.name ?? target.name,
            title: b.title ?? target.title,
            phone: b.phone ?? target.phone,
            phone2: b.phone2 ?? target.phone2,
            email: b.email ?? target.email,
            category: b.category ?? target.category,
            isEmergency: b.isEmergency ?? target.isEmergency,
            projectId: b.projectId ?? target.projectId,
            priority: b.priority !== undefined ? Number(b.priority) : target.priority,
          },
        })
        return NextResponse.json({ ok: true })
      }
    }
  } catch (e) {
    console.error('admin update error', e)
    return NextResponse.json({ error: 'خطا در ویرایش' }, { status: 500 })
  }
  return NextResponse.json({ error: 'entity نامعتبر' }, { status: 400 })
})

// DELETE /api/admin/resource/[entity]/[id]
export const DELETE = requireAdmin(async (user, _req, ctx) => {
  const { entity, id } = await ctx.params
  const orgId = user.organizationId
  try {
    switch (entity) {
      case 'users': {
        // غیرفعال‌سازی به‌جای حذف برای حفظ تاریخچه
        await db.user.updateMany({ where: { id, organizationId: orgId }, data: { isActive: false } })
        return NextResponse.json({ ok: true })
      }
      case 'groups':
        await db.group.deleteMany({ where: { id, organizationId: orgId, isSystem: false } })
        return NextResponse.json({ ok: true })
      case 'projects':
        await db.project.updateMany({ where: { id, organizationId: orgId }, data: { isActive: false } })
        return NextResponse.json({ ok: true })
      case 'codes':
        await db.activationCode.deleteMany({ where: { id, organizationId: orgId } })
        return NextResponse.json({ ok: true })
      case 'contacts':
        await db.contact.deleteMany({ where: { id, organizationId: orgId } })
        return NextResponse.json({ ok: true })
    }
  } catch (e) {
    console.error('admin delete error', e)
    return NextResponse.json({ error: 'خطا در حذف' }, { status: 500 })
  }
  return NextResponse.json({ error: 'entity نامعتبر' }, { status: 400 })
})
