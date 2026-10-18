'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { INCIDENT_TYPES, ALERT_LEVELS, GROUP_KINDS, CATEGORY_LABELS, isIncidentType, isAlertLevel } from '@/lib/constants'
import { api, faDateTime, faTime, faDate, faRelative, faNum, type BootstrapData, type ActiveAlert, type HistoryAlert, type ContactInfo, type GroupInfo } from '@/lib/client-api'
import {
  Siren, Bell, Phone, Mail, MapPin, Building2, Users, ChevronLeft, CheckCircle2, Clock,
  Search, History as HistoryIcon, Megaphone, TrendingUp, CheckCheck, Timer, ShieldAlert, BadgeCheck, UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════ خانه ═══════════════════════
export function HomeScreen({
  data,
  onActivate,
  onMonitor,
  onOpenAlert,
  goTab,
}: {
  data: BootstrapData
  onActivate: () => void
  onMonitor: (alertId: string) => void
  onOpenAlert: (a: ActiveAlert) => void
  goTab: (tab: string) => void
}) {
  const { user, activeAlerts, groups } = data
  const canActivate = user.canActivate || user.role !== 'USER'
  const myActive = activeAlerts.filter((a) => a.isMine)
  const received = activeAlerts.filter((a) => !a.isMine)

  return (
    <div className="space-y-4 pb-4">
      {/* کارت خوش‌آمد */}
      <div className="rounded-2xl bg-gradient-to-l from-slate-900 to-slate-800 text-white p-4 flex items-center gap-3 shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shrink-0">
          <UserRound className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black">{user.fullName}</p>
          <p className="text-xs text-white/70 truncate">{user.jobTitle || 'پرسنل'} · {user.organization.name}</p>
        </div>
        <Badge className="bg-white/10 text-white border-0 rounded-full text-[10px] shrink-0">
          {user.role === 'ADMIN' ? 'مدیر سیستم' : user.role === 'DISPATCHER' ? 'اعلام‌کننده' : 'پرسنل'}
        </Badge>
      </div>

      {/* دکمه فعال‌سازی (فقط مجاز) */}
      {canActivate ? (
        <button
          onClick={onActivate}
          className="w-full rounded-3xl bg-gradient-to-b from-red-600 to-red-700 active:scale-[0.98] transition-transform p-[2px] shadow-xl shadow-red-200 block"
        >
          <div className="rounded-[calc(1.5rem-2px)] border-2 border-red-500/60 bg-gradient-to-b from-red-500 to-red-600 px-4 py-5 flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-white/25 ihms-ripple" />
              <div className="w-16 h-16 rounded-full bg-white/15 border-4 border-white/30 flex items-center justify-center">
                <Siren className="w-8 h-8 text-white" />
              </div>
            </div>
            <span className="text-white font-black text-lg mt-1">فعال‌سازی شرایط اضطراری</span>
            <span className="text-white/80 text-xs">اعلام حادثه و اطلاع‌رسانی لحظه‌ای به گروه‌ها</span>
          </div>
        </button>
      ) : (
        <Card className="rounded-2xl border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">آماده دریافت هشدار</p>
              <p className="text-xs text-slate-500">در صورت فعال‌شدن شرایط اضطراری، صفحه قرمز و آژیر نمایش داده می‌شود</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* هشدارهای من (گزارش‌دهنده) */}
      {myActive.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-red-600" />
            شرایط اضطراری فعال من
          </h2>
          {myActive.map((a) => (
            <button
              key={a.id}
              onClick={() => onMonitor(a.id)}
              className="w-full text-right rounded-2xl border-2 border-red-200 bg-red-50 p-3.5 flex items-center gap-3 hover:bg-red-100/60 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-red-600 ihms-siren-pulse flex items-center justify-center shrink-0">
                <Siren className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{a.title}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {a.location}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-emerald-600 text-white rounded-full text-[10px] gap-0.5">
                    <CheckCheck className="w-3 h-3" />
                    {faNum(a.ackCount || 0)} تأیید
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[10px] bg-white">
                    <Users className="w-3 h-3 ml-0.5" />
                    {faNum(a.targetCount || 0)} گیرنده
                  </Badge>
                  <span className="text-[10px] text-slate-400">{faRelative(a.createdAt)}</span>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          ))}
        </section>
      )}

      {/* هشدارهای دریافتی فعال */}
      {received.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-red-600" />
            هشدارهای فعال پروژه‌های من
          </h2>
          {received.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenAlert(a)}
              className="w-full text-right rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 hover:border-red-200 transition-colors"
            >
              <span className="text-2xl shrink-0">{isIncidentType(a.type) ? INCIDENT_TYPES[a.type].icon : '⚠️'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{a.title}</p>
                <p className="text-xs text-slate-500 truncate">{a.project?.name} — {a.location}</p>
                <span className="text-[10px] text-slate-400">{faRelative(a.createdAt)}</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-300 shrink-0" />
            </button>
          ))}
        </section>
      )}

      {activeAlerts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-700">وضعیت آرام — هشدار فعالی وجود ندارد</p>
          <p className="text-xs text-slate-400 mt-1">آخرین بررسی: {faTime(new Date())}</p>
        </div>
      )}

      {/* دسترسی سریع */}
      <section className="space-y-2">
        <h2 className="text-sm font-black text-slate-700">دسترسی سریع</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => goTab('alerts')} className="rounded-2xl bg-white border border-slate-200 p-4 text-right hover:border-red-200 transition-colors">
            <Bell className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">هشدارهای فعال</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{faNum(activeAlerts.length)} مورد در جریان</p>
          </button>
          <button onClick={() => goTab('contacts')} className="rounded-2xl bg-white border border-slate-200 p-4 text-right hover:border-red-200 transition-colors">
            <Phone className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">مخاطبین اضطراری</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{faNum(data.contacts.length)} شماره تماس</p>
          </button>
          <button onClick={() => goTab('history')} className="rounded-2xl bg-white border border-slate-200 p-4 text-right hover:border-red-200 transition-colors">
            <HistoryIcon className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">تاریخچه حوادث</p>
            <p className="text-[11px] text-slate-400 mt-0.5">گزارش هشدارهای پایان‌یافته</p>
          </button>
          <button onClick={() => goTab('groups')} className="rounded-2xl bg-white border border-slate-200 p-4 text-right hover:border-red-200 transition-colors">
            <Users className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">گروه‌های اضطراری</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{faNum(groups.length)} گروه تعریف‌شده</p>
          </button>
        </div>
      </section>

      {/* گروه‌های من */}
      <section className="space-y-2">
        <h2 className="text-sm font-black text-slate-700">گروه‌های اضطراری سازمان</h2>
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <Badge key={g.id} variant="outline" className="rounded-full bg-white text-xs py-1.5 px-3 gap-1">
              <span>{GROUP_KINDS[g.kind as keyof typeof GROUP_KINDS]?.icon ?? '📌'}</span>
              {g.name}
              <span className="text-slate-400">({faNum(g.members.length)})</span>
            </Badge>
          ))}
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════ هشدارهای فعال ═══════════════════════
export function AlertsScreen({
  data,
  onMonitor,
  onOpenAlert,
}: {
  data: BootstrapData
  onMonitor: (alertId: string) => void
  onOpenAlert: (a: ActiveAlert) => void
}) {
  const mine = data.activeAlerts.filter((a) => a.isMine)
  const others = data.activeAlerts.filter((a) => !a.isMine)

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-lg font-black text-slate-900">هشدارهای فعال</h1>

      {data.activeAlerts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-slate-700">هیچ هشدار فعالی وجود ندارد</p>
          <p className="text-xs text-slate-400 mt-1">در صورت بروز حادثه، هشدار به‌صورت لحظه‌ای اینجا نمایش داده می‌شود</p>
        </div>
      )}

      {[...mine, ...others].map((a) => {
        const t = isIncidentType(a.type) ? INCIDENT_TYPES[a.type] : INCIDENT_TYPES.OTHER
        const l = isAlertLevel(a.level) ? ALERT_LEVELS[a.level] : ALERT_LEVELS.LEVEL_2
        return (
          <div key={a.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <span className="text-3xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-slate-900">{a.title}</p>
                  <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: l.color }}>
                    {l.short}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {a.project?.name}
                  <span className="mx-1">•</span>
                  <MapPin className="w-3 h-3" /> {a.location}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {faDateTime(a.createdAt)} · گزارش: {a.reportedBy?.fullName || a.reportedByName || '—'}
                </p>
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              {a.isMine ? (
                <Button onClick={() => onMonitor(a.id)} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-2">
                  <Siren className="w-4.5 h-4.5" />
                  پایش زنده تأییدها
                </Button>
              ) : (
                <Button onClick={() => onOpenAlert(a)} variant="outline" className="flex-1 h-11 rounded-xl bg-white font-bold">
                  مشاهده جزئیات
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════ مخاطبین اضطراری ═══════════════════════
export function ContactsScreen({ data }: { data: BootstrapData }) {
  const [query, setQuery] = useState('')
  const contacts = data.contacts.filter(
    (c) => !query.trim() || c.name.includes(query.trim()) || c.title.includes(query.trim()) || (CATEGORY_LABELS[c.category] || '').includes(query.trim()),
  )
  const byCategory = contacts.reduce<Record<string, ContactInfo[]>>((acc, c) => {
    const key = c.category
    ;(acc[key] ||= []).push(c)
    return acc
  }, {})

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-lg font-black text-slate-900">مخاطبین و تیم‌های اضطراری</h1>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="h-11 rounded-xl bg-white border-slate-200 pr-9"
          placeholder="جستجوی نام، سمت یا دسته..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {Object.entries(byCategory).map(([cat, list]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-xs font-black text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-4 rounded-full bg-red-600 inline-block" />
            {CATEGORY_LABELS[cat] || cat}
            <span className="text-slate-300">({faNum(list.length)})</span>
          </h2>
          {list.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white border border-slate-200 p-3.5 flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  c.isEmergency ? 'bg-red-100' : 'bg-slate-100'
                }`}
              >
                <Phone className={`w-5 h-5 ${c.isEmergency ? 'text-red-600' : 'text-slate-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  {c.name}
                  {c.isEmergency && <BadgeCheck className="w-4 h-4 text-red-600" />}
                </p>
                <p className="text-xs text-slate-500 truncate">{c.title}</p>
                {c.project && <p className="text-[10px] text-slate-400 mt-0.5">پروژه: {c.project.name}</p>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <a
                  href={`tel:${c.phone}`}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 flex items-center gap-1 text-xs font-bold"
                  dir="ltr"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {c.phone}
                </a>
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 h-8 px-3 flex items-center gap-1 text-[10px]"
                  >
                    <Mail className="w-3 h-3" />
                    ایمیل
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      {contacts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          مخاطبی یافت نشد
        </div>
      )}
    </div>
  )
}

// ═══════════════════════ تاریخچه ═══════════════════════
export function HistoryScreen({ onOpenAlert }: { onOpenAlert: (id: string) => void }) {
  const [items, setItems] = useState<HistoryAlert[] | null>(null)
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    api.get<{ alerts: HistoryAlert[] }>('/api/alerts?scope=history').then((r) => setItems(r.alerts)).catch(() => setItems([]))
    api.get<BootstrapData>('/api/bootstrap').then((r) => setProjects(r.projects)).catch(() => {})
  }, [])

  const filtered = (items || []).filter(
    (a) =>
      (projectFilter === 'ALL' || a.project?.name === projectFilter) &&
      (!query.trim() || a.title.includes(query.trim()) || a.location.includes(query.trim())),
  )

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-lg font-black text-slate-900">تاریخچه هشدارها</h1>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="h-11 rounded-xl bg-white border-slate-200 pr-9"
          placeholder="جستجو در تاریخچه..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto ihms-scroll pb-1">
        <button onClick={() => setProjectFilter('ALL')}>
          <Badge variant="outline" className={`rounded-full cursor-pointer px-3 py-1.5 text-xs ${projectFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>
            همه پروژه‌ها
          </Badge>
        </button>
        {projects.map((p) => (
          <button key={p.id} onClick={() => setProjectFilter(p.name)}>
            <Badge variant="outline" className={`rounded-full cursor-pointer px-3 py-1.5 text-xs whitespace-nowrap ${projectFilter === p.name ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>
              {p.name}
            </Badge>
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="py-12 text-center text-sm text-slate-400">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <HistoryIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">هنوز حادثه‌ای در پروژه‌های شما ثبت نشده است</p>
        </div>
      ) : (
        filtered.map((a) => {
          const t = isIncidentType(a.type) ? INCIDENT_TYPES[a.type] : INCIDENT_TYPES.OTHER
          const l = isAlertLevel(a.level) ? ALERT_LEVELS[a.level] : ALERT_LEVELS.LEVEL_2
          return (
            <button
              key={a.id}
              onClick={() => onOpenAlert(a.id)}
              className="w-full text-right rounded-2xl bg-white border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-slate-900">{a.title}</p>
                    <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: l.color }}>
                      {l.short}
                    </span>
                    <Badge variant="outline" className="rounded-full text-[10px] bg-slate-50">
                      {a.status === 'ENDED' ? 'پایان‌یافته' : 'لغوشده'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {a.project?.name} · {a.location}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {faDate(a.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {a.durationMin !== null ? `${faNum(a.durationMin)} دقیقه` : '—'}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCheck className="w-3 h-3" />
                      {faNum(a.ackCount)}/{faNum(a.targetCount)}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}

// ═══════════════════════ گروه‌ها (نمای اطلاعاتی) ═══════════════════════
export function GroupsScreen({ data }: { data: BootstrapData }) {
  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-lg font-black text-slate-900">گروه‌های واکنش اضطراری</h1>
      <p className="text-xs text-slate-500 -mt-2">
        گروه‌بندی پرسنل برای اطلاع‌رسانی هوشمند بر اساس نوع حادثه. مدیریت گروه‌ها در پنل مدیریت انجام می‌شود.
      </p>
      {data.groups.map((g: GroupInfo) => {
        const k = GROUP_KINDS[g.kind as keyof typeof GROUP_KINDS]
        return (
          <div key={g.id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${g.color}15` }}>
                {k?.icon ?? '📌'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-900">{g.name}</p>
                <p className="text-[11px] text-slate-400">{k?.label || 'گروه سفارشی'} · {faNum(g.members.length)} عضو</p>
              </div>
            </div>
            {g.members.length > 0 && (
              <div className="px-4 py-3 space-y-2">
                {g.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {m.fullName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{m.fullName}</p>
                      <p className="text-[10px] text-slate-400">{m.roleInGroup || m.jobTitle || 'عضو'}</p>
                    </div>
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="text-emerald-600 hover:text-emerald-700 p-1.5" aria-label={`تماس ${m.fullName}`}>
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
