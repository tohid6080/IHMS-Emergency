import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/server-auth'
import { createSessionToken } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const expired = !user.organization.isActive || user.organization.subscriptionEndsAt < new Date()
  // توکن برای احراز هویت سوکت در کلاینت
  const socketToken = createSessionToken(user.id, user.organizationId)
  return NextResponse.json({ user, subscriptionExpired: expired, socketToken })
}
