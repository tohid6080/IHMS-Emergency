'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Siren, KeyRound, UserRound, Eye, EyeOff, ShieldCheck, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/client-api'

interface Props {
  onLoggedIn: () => void
}

export function LoginScreen({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  async function requestNotifications() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    } catch {}
  }

  async function submitLogin() {
    if (!username.trim() || !password) {
      toast.error('نام کاربری و رمز عبور را وارد کنید')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(data.error || 'خطا در ورود', res.status, data.code)
      const me = await fetch('/api/auth/me').then((r) => r.json())
      if (me?.socketToken) localStorage.setItem('ihms_socket_token', me.socketToken)
      await requestNotifications()
      toast.success(`خوش آمدید ${me?.user?.fullName ?? ''}`)
      onLoggedIn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ورود')
    } finally {
      setLoading(false)
    }
  }

  async function submitCode() {
    if (!code.trim()) {
      toast.error('کد فعال‌سازی را وارد کنید')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(data.error || 'کد نامعتبر است', res.status, data.code)
      const me = await fetch('/api/auth/me').then((r) => r.json())
      if (me?.socketToken) localStorage.setItem('ihms_socket_token', me.socketToken)
      await requestNotifications()
      toast.success(`خوش آمدید ${me?.user?.fullName ?? ''}`)
      onLoggedIn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'کد نامعتبر است')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-red-50 via-white to-slate-100 px-4 py-8 relative overflow-hidden">
      {/* پس‌زمینه تزئینی */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-red-100/60 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-red-100/40 blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* لوگو */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-red-500/20 ihms-ripple" />
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-xl shadow-red-200">
              <Siren className="w-10 h-10 text-white" strokeWidth={2.2} />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">IHMS Emergency</h1>
          <p className="text-sm text-slate-500 mt-1">سامانه هوشمند اطلاع‌رسانی شرایط اضطراری HSE</p>
        </div>

        <Card className="border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardContent className="p-5 pt-5">
            <Tabs defaultValue="account" dir="rtl">
              <TabsList className="grid grid-cols-2 w-full mb-5 h-11 bg-slate-100 rounded-xl p-1">
                <TabsTrigger value="account" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm gap-1.5">
                  <UserRound className="w-4 h-4" />
                  حساب سازمانی
                </TabsTrigger>
                <TabsTrigger value="code" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  کد فعال‌سازی
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700 text-sm">
                    نام کاربری سازمانی
                  </Label>
                  <Input
                    id="username"
                    dir="ltr"
                    className="h-11 rounded-xl text-left placeholder:text-right bg-slate-50 border-slate-200"
                    placeholder="مثال: d.jorkesh"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 text-sm">
                    رمز عبور
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      dir="ltr"
                      className="h-11 rounded-xl text-left pl-11 bg-slate-50 border-slate-200"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="نمایش رمز"
                    >
                      {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={submitLogin}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-200"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ورود به سامانه'}
                </Button>
              </TabsContent>

              <TabsContent value="code" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-700 text-sm">
                    کد فعال‌سازی سازمان
                  </Label>
                  <Input
                    id="code"
                    dir="ltr"
                    className="h-12 rounded-xl text-center text-lg font-bold tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:text-sm bg-slate-50 border-slate-200"
                    placeholder="IHMS-XXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && submitCode()}
                  />
                </div>
                <p className="text-xs text-slate-500 leading-5">
                  کد فعال‌سازی توسط سازمان برای شما صادر می‌شود و دسترسی پروژه‌ها و گروه‌های شما به‌صورت خودکار بر اساس کد اعمال می‌گردد.
                </p>
                <Button
                  onClick={submitCode}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-200"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'فعال‌سازی حساب'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* حساب‌های نمونه */}
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="mt-4 mx-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          اطلاعات ورود نمونه (دمو)
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
        </button>
        {showDemo && (
          <div className="mt-2 rounded-xl bg-white/80 border border-slate-200 p-3 text-xs space-y-1.5 text-slate-600">
            <p className="font-semibold text-slate-700 mb-1">حساب سازمانی:</p>
            <p dir="ltr" className="text-left">admin / admin123 <span className="text-slate-400">(مدیر سیستم)</span></p>
            <p dir="ltr" className="text-left">dispatcher / 123456 <span className="text-slate-400">(HSE — فعال‌سازی اضطراری)</span></p>
            <p dir="ltr" className="text-left">worker1 / 123456 <span className="text-slate-400">(پرسنل — دریافت هشدار)</span></p>
            <p className="font-semibold text-slate-700 pt-1 mb-1">کدهای فعال‌سازی:</p>
            <p dir="ltr" className="text-left">HSE-CODE-01 · FIRE-TEAM-01 · WORKER-01</p>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-6">
          با ورود، شرایط استفاده و سیاست حریم خصوصی سازمان را می‌پذیرید
        </p>
      </div>
    </div>
  )
}
