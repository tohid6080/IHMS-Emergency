'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LoginScreen } from '@/components/ihms/login-screen'
import { FullScreenAlert } from '@/components/ihms/full-screen-alert'
import { ActivateDialog } from '@/components/ihms/activate-dialog'
import { MonitorSheet } from '@/components/ihms/monitor-sheet'
import { AlertDetailSheet } from '@/components/ihms/alert-detail-sheet'
import { AdminScreen } from '@/components/ihms/admin-screen'
import { HomeScreen, AlertsScreen, ContactsScreen, HistoryScreen, GroupsScreen } from '@/components/ihms/app-screens'
import { api, faTime, type BootstrapData, type ActiveAlert } from '@/lib/client-api'
import { useSocket, type AlertAckPayload } from '@/lib/use-socket'
import { Button } from '@/components/ui/button'
import {
  Home, Bell, Phone, History as HistoryIcon, Users, Settings, LogOut, Siren, Wifi, WifiOff, Crown,
} from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'home' | 'alerts' | 'contacts' | 'history' | 'groups' | 'admin'

interface FullAlertState {
  alert: {
    id: string
    code: string
    type: string
    level: string
    title: string
    location: string
    description: string | null
    instructions: string | null
    createdAt: string
    projectId: string
    projectName: string
    reportedById?: string
    reportedByName: string
    reportedByTitle?: string | null
  }
  initialAcked: boolean
}

export default function Page() {
  const [boot, setBoot] = useState<BootstrapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('home')
  const [fullAlert, setFullAlert] = useState<FullAlertState | null>(null)
  const [activateOpen, setActivateOpen] = useState(false)
  const [monitorId, setMonitorId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [liveAcks, setLiveAcks] = useState<({ alertId: string; userId: string; ackAt: string } & Partial<AlertAckPayload>)[]>([])
  const notifiedIds = useRef<Set<string>>(new Set())
  const notifiedAcked = useRef<Set<string>>(new Set())

  // ─── بارگذاری اولیه ───
  const loadBootstrap = useCallback(async () => {
    try {
      const data = await api.get<BootstrapData>('/api/bootstrap')
      setBoot(data)
      // اگر هشدار فعالِ تأییدنشده دارم (فقط گیرنده، نه گزارش‌دهنده) → صفحه قرمز
      const myAlert = data.activeAlerts.find(
        (a) => a.isTarget && !a.isMine && !a.myAck && !notifiedAcked.current.has(a.id),
      )
      if (myAlert && !notifiedIds.current.has(myAlert.id)) {
        notifiedIds.current.add(myAlert.id)
        setFullAlert({
          alert: {
            id: myAlert.id,
            code: myAlert.code,
            type: myAlert.type,
            level: myAlert.level,
            title: myAlert.title,
            location: myAlert.location,
            description: myAlert.description,
            instructions: myAlert.instructions,
            createdAt: myAlert.createdAt,
            projectId: myAlert.projectId,
            projectName: myAlert.project?.name || '',
            reportedByName: myAlert.reportedBy?.fullName || '—',
            reportedByTitle: null,
          },
          initialAcked: false,
        })
      }
    } catch (e) {
      setBoot(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBootstrap()
    // ثبت Service Worker برای PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [loadBootstrap])

  // ─── سوکت realtime ───
  const onAlertNew = useCallback(
    (p: { alert: FullAlertState['alert']; targets: string[] }) => {
      const myId = boot?.user.id || ''
      const isTarget = p.targets.includes(myId)
      const isMine = p.alert.reportedById === myId
      // به‌روزرسانی لیست هشدارهای فعال
      loadBootstrap()
      if (!isTarget || isMine || notifiedIds.current.has(p.alert.id)) {
        // اگر گزارش‌دهنده/ادمین هستم فقط اطلاع‌رسانی متنی (صفحه قرمز فقط برای گیرندگان واقعی)
        if (!isTarget && !isMine && boot && boot.user.role !== 'USER' && !notifiedIds.current.has(p.alert.id)) {
          notifiedIds.current.add(p.alert.id)
          toast.info(`🚨 شرایط اضطراری «${p.alert.title}» فعال شد`, {
            description: 'برای پایش، بخش هشدارها را ببینید',
            duration: 6000,
          })
        }
        return
      }
      notifiedIds.current.add(p.alert.id)
      setFullAlert({ alert: p.alert, initialAcked: false })
    },
    [boot, loadBootstrap],
  )

  const onAck = useCallback((p: AlertAckPayload) => {
    setLiveAcks((prev) => [...prev, { alertId: p.alertId, userId: p.user.id, ackAt: p.ackAt, ...p }])
    // اگر هشدار باز است و تأیید من نیست — فقط لیست پایش به‌روز می‌شود (در MonitorSheet)
  }, [])

  const onEnd = useCallback(
    (p: { alertId: string; endedByName: string }) => {
      // بستن صفحه قرمز اگر برای همین هشدار است
      setFullAlert((cur) => (cur?.alert.id === p.alertId ? null : cur))
      setLiveAcks((prev) => prev.filter((x) => x.alertId !== p.alertId))
      loadBootstrap()
      if (monitorId === p.alertId) {
        setMonitorId(null)
        toast.success(`شرایط اضطراری توسط ${p.endedByName} پایان یافت`)
      }
    },
    [loadBootstrap, monitorId],
  )

  const onMute = useCallback(() => {}, [])

  const { connected, reAuth } = useSocket({ onAlertNew, onAck, onEnd, onMute })

  // احراز هویت سوکت پس از ورود (اتصال قبل از لاگین شکل می‌گیرد)
  useEffect(() => {
    if (boot) {
      fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.socketToken) {
            localStorage.setItem('ihms_socket_token', d.socketToken)
            reAuth()
          }
        })
        .catch(() => {})
    }
  }, [boot?.user.id, reAuth])

  // ─── خروج ───
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('ihms_socket_token')
      setBoot(null)
      setFullAlert(null)
      setTab('home')
      toast.info('از حساب خارج شدید')
    } catch {}
  }

  // ─── حالت‌های نمایش ───
  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center ihms-siren-pulse">
          <Siren className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm text-slate-400 font-medium">IHMS Emergency</p>
      </div>
    )
  }

  if (!boot) {
    return <LoginScreen onLoggedIn={() => { setLoading(true); loadBootstrap() }} />
  }

  const user = boot.user
  const isAdmin = user.role === 'ADMIN' || user.accessLevel === 'ADMIN'
  const navItems: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'خانه', icon: Home },
    { id: 'alerts', label: 'هشدارها', icon: Bell },
    { id: 'contacts', label: 'مخاطبین', icon: Phone },
    { id: 'history', label: 'تاریخچه', icon: HistoryIcon },
    ...(isAdmin ? [{ id: 'admin' as Tab, label: 'مدیریت', icon: Settings }] : []),
  ]

  return (
    <div className="min-h-dvh bg-slate-100 flex justify-center">
      <div className="w-full max-w-md bg-slate-50 min-h-dvh relative shadow-2xl">
        {/* ─── هدر ─── */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shrink-0">
              <Siren className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-slate-900 leading-tight">IHMS Emergency</p>
              <p className="text-[10px] text-slate-400 truncate">{user.organization.name}</p>
            </div>
            {/* وضعیت اتصال */}
            <div
              className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-1 ${
                connected ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
              }`}
              title={connected ? 'اتصال لحظه‌ای برقرار' : 'اتصال برقرار نیست'}
            >
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? 'لحظه‌ای' : 'قطع'}
            </div>
            {isAdmin && (
              <button onClick={() => setTab('admin')} className="p-2 rounded-xl text-amber-600 bg-amber-50" aria-label="پنل مدیریت">
                <Crown className="w-4 h-4" />
              </button>
            )}
            <button onClick={logout} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50" aria-label="خروج">
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* ─── محتوا ─── */}
        <main className="px-3 py-4 pb-24">
          {boot.subscriptionExpired && (
            <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-300 p-3.5 text-sm text-amber-900">
              ⚠️ اشتراک سازمان به‌زودی منقضی می‌شود. برای تمدید با پشتیبانی تماس بگیرید.
            </div>
          )}
          {tab === 'home' && (
            <HomeScreen
              data={boot}
              onActivate={() => setActivateOpen(true)}
              onMonitor={(id) => setMonitorId(id)}
              onOpenAlert={(a) => {
                setDetailId(a.id)
                setDetailOpen(true)
              }}
              goTab={(t) => setTab(t as Tab)}
            />
          )}
          {tab === 'alerts' && (
            <AlertsScreen
              data={boot}
              onMonitor={(id) => setMonitorId(id)}
              onOpenAlert={(a) => {
                setDetailId(a.id)
                setDetailOpen(true)
              }}
            />
          )}
          {tab === 'contacts' && <ContactsScreen data={boot} />}
          {tab === 'history' && (
            <HistoryScreen
              onOpenAlert={(id) => {
                setDetailId(id)
                setDetailOpen(true)
              }}
            />
          )}
          {tab === 'groups' && <GroupsScreen data={boot} />}
          {tab === 'admin' && isAdmin && <AdminScreen />}
        </main>

        {/* ─── ناوبری پایین ─── */}
        <nav className="fixed bottom-0 inset-x-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-slate-200 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5">
          <div className="grid px-2" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0,1fr))` }}>
            {navItems.map((item) => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${
                    active ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold">{item.label}</span>
                  {item.id === 'alerts' && boot.activeAlerts.length > 0 && (
                    <span className="absolute -mt-7 mr-6 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                      {boot.activeAlerts.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ─── دیالوگ فعال‌سازی ─── */}
        <ActivateDialog
          open={activateOpen}
          onClose={() => setActivateOpen(false)}
          projects={boot.projects}
          groups={boot.groups}
          defaultProjectId={boot.projects[0]?.id}
          onActivated={(a) => {
            loadBootstrap()
            setMonitorId(a.id)
          }}
        />

        {/* ─── پایش زنده ─── */}
        {monitorId && (
          <MonitorSheet
            open={!!monitorId}
            alertId={monitorId}
            onClose={() => setMonitorId(null)}
            liveAcks={liveAcks}
            onEnded={loadBootstrap}
          />
        )}

        {/* ─── جزئیات هشدار ─── */}
        <AlertDetailSheet
          open={detailOpen}
          alertId={detailId}
          onClose={() => setDetailOpen(false)}
          onMonitor={(id) => {
            setDetailOpen(false)
            setMonitorId(id)
          }}
        />
      </div>

      {/* ─── صفحه تمام‌قرمز (روی همه چیز) ─── */}
      {fullAlert && (
        <FullScreenAlert
          alert={fullAlert.alert}
          initialAcked={fullAlert.initialAcked}
          onAcked={() => {
            if (fullAlert) notifiedAcked.current.add(fullAlert.alert.id)
            loadBootstrap()
          }}
          onClose={() => setFullAlert(null)}
        />
      )}
    </div>
  )
}
