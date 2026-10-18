import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { createSessionToken, SESSION_COOKIE } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'نام کاربری و رمز عبور الزامی است' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { organization: true },
    })

    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (!user || user.password !== hash) {
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور نادرست است' }, { status: 401 })
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'حساب کاربری شما غیرفعال شده است' }, { status: 403 })
    }

    // کنترل اشتراک سازمان
    const org = user.organization
    if (!org.isActive) {
      return NextResponse.json({ error: 'سازمان شما غیرفعال است. با پشتیبانی تماس بگیرید.' }, { status: 403 })
    }
    if (org.subscriptionEndsAt < new Date()) {
      return NextResponse.json(
        { error: `اشتراک سازمان «${org.name}» منقضی شده است. لطفاً اشتراک را تمدید کنید.`, code: 'SUBSCRIPTION_EXPIRED' },
        { status: 403 },
      )
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
    console.error('login error', e)
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 })
  }
}
