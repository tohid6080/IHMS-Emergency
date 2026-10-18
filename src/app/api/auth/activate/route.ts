import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, SESSION_COOKIE } from '@/lib/session'

// ورود با کد فعال‌سازی سازمانی
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'کد فعال‌سازی الزامی است' }, { status: 400 })
    }

    const activation = await db.activationCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { organization: true, user: true },
    })

    if (!activation || !activation.isActive) {
      return NextResponse.json({ error: 'کد فعال‌سازی نامعتبر است' }, { status: 401 })
    }
    if (activation.expiresAt && activation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'این کد فعال‌سازی منقضی شده است' }, { status: 403 })
    }
    const user = activation.user
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'کاربر متصل به این کد غیرفعال است' }, { status: 403 })
    }

    const org = activation.organization
    if (!org.isActive || org.subscriptionEndsAt < new Date()) {
      return NextResponse.json(
        { error: 'اشتراک سازمان منقضی یا غیرفعال است. با پشتیبانی تماس بگیرید.', code: 'SUBSCRIPTION_EXPIRED' },
        { status: 403 },
      )
    }

    // ثبت اولین استفاده
    if (!activation.usedAt) {
      await db.activationCode.update({ where: { id: activation.id }, data: { usedAt: new Date() } })
    }

    const token = createSessionToken(user.id, user.organizationId)
    const res = NextResponse.json({ ok: true, userId: user.id })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (e) {
    console.error('activate error', e)
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 })
  }
}
