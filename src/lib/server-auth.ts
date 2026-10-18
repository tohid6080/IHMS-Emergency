import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session'

export interface AuthedUser {
  id: string
  organizationId: string
  username: string
  fullName: string
  jobTitle: string | null
  phone: string | null
  email: string | null
  role: string
  accessLevel: string
  canActivate: boolean
  organization: {
    id: string
    name: string
    code: string
    subscriptionEndsAt: Date
    isActive: boolean
    plan: string
    maxUsers: number
  }
  projects: { id: string; name: string; location: string | null }[]
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value
  if (cookieToken) return cookieToken
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function getSessionUser(req: NextRequest): Promise<AuthedUser | null> {
  const token = getTokenFromRequest(req)
  const payload = verifySessionToken(token)
  if (!payload) return null

  const user = await db.user.findUnique({
    where: { id: payload.uid },
    include: {
      organization: true,
      projects: { include: { project: true } },
    },
  })
  if (!user || !user.isActive) return null

  return {
    id: user.id,
    organizationId: user.organizationId,
    username: user.username,
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    phone: user.phone,
    email: user.email,
    role: user.role,
    accessLevel: user.accessLevel,
    canActivate: user.canActivate,
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      code: user.organization.code,
      subscriptionEndsAt: user.organization.subscriptionEndsAt,
      isActive: user.organization.isActive,
      plan: user.organization.plan,
      maxUsers: user.organization.maxUsers,
    },
    projects: user.projects.map((up) => ({
      id: up.project.id,
      name: up.project.name,
      location: up.project.location,
    })),
  }
}

type RouteCtx = { params: Promise<Record<string, string>> }

export function requireAuth(handler: (user: AuthedUser, req: NextRequest, ctx: RouteCtx) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: RouteCtx) => {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 })
    }
    // کنترل اشتراک سازمان
    if (!user.organization.isActive || user.organization.subscriptionEndsAt < new Date()) {
      return NextResponse.json(
        { error: 'اشتراک سازمان منقضی شده است. با پشتیبانی تماس بگیرید.', code: 'SUBSCRIPTION_EXPIRED' },
        { status: 403 },
      )
    }
    return handler(user, req, ctx)
  }
}

export function requireAdmin(handler: (user: AuthedUser, req: NextRequest, ctx: RouteCtx) => Promise<NextResponse>) {
  return requireAuth(async (user, req, ctx) => {
    if (user.role !== 'ADMIN' && user.accessLevel !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی فقط برای مدیر سیستم' }, { status: 403 })
    }
    return handler(user, req, ctx)
  })
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
