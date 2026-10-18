'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users, UsersRound, Building2, KeyRound, PhoneCall, Crown, Plus, Pencil, Trash2, RefreshCw,
  Search, TrendingUp, CheckCheck, Timer, ShieldCheck, CalendarClock, Loader2, Megaphone,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, faDate, faDateTime, faNum } from '@/lib/client-api'
import { GROUP_KINDS, ROLE_LABELS, ACCESS_LEVEL_LABELS, CATEGORY_LABELS, INCIDENT_TYPES, isIncidentType } from '@/lib/constants'

// ═══════════ تایپ‌ها ═══════════
interface AdminUser {
  id: string
  username: string
  fullName: string
  jobTitle: string | null
  personnelCode: string | null
  phone: string | null
  email: string | null
  role: string
  accessLevel: string
  canActivate: boolean
  isActive: boolean
  projects: { id: string; name: string }[]
  groups: { id: string; name: string; kind: string }[]
  codes: string[]
}
interface AdminGroup {
  id: string
  name: string
  kind: string
  description: string | null
  color: string
  isSystem: boolean
  members: { id: string; fullName: string; jobTitle: string | null; roleInGroup: string | null }[]
}
interface AdminProject {
  id: string
  name: string
  location: string | null
  description: string | null
  isActive: boolean
  users: { user: { id: string; fullName: string } }[]
  _count: { alerts: number }
}
interface AdminCode {
  id: string
  code: string
  label: string | null
  role: string
  canActivate: boolean
  isActive: boolean
  usedAt: string | null
  expiresAt: string | null
  user: { id: string; fullName: string; username: string } | null
}
interface AdminContact {
  id: string
  name: string
  title: string
  phone: string
  phone2: string | null
  email: string | null
  category: string
  isEmergency: boolean
  priority: number
  project: { name: string } | null
}
interface OrgInfo {
  id: string
  name: string
  code: string
  plan: string
  maxUsers: number
  isActive: boolean
  subscriptionEndsAt: string
  _count: { users: number; projects: number; groups: number; alerts: number }
}
interface Stats {
  totalUsers: number
  activeUsers: number
  totalProjects: number
  totalGroups: number
  totalAlerts: number
  activeAlerts: number
  totalAcks: number
  avgAckMin: number | null
  daysLeft: number
  recentAlerts: { id: string; code: string; type: string; level: string; title: string; status: string; createdAt: string; project: string; reportedBy: string; ackCount: number; targetCount: number }[]
}

type Tab = 'dashboard' | 'users' | 'groups' | 'projects' | 'codes' | 'contacts' | 'subscription'

export function AdminScreen() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [codes, setCodes] = useState<AdminCode[]>([])
  const [contacts, setContacts] = useState<AdminContact[]>([])
  const [query, setQuery] = useState('')

  const loadAll = useCallback(async () => {
    try {
      const [s, o, u, g, p, c, k] = await Promise.all([
        api.get<Stats>('/api/admin/stats'),
        api.get<{ org: OrgInfo }>('/api/admin/org'),
        api.get<{ users: AdminUser[] }>('/api/admin/resource/users'),
        api.get<{ groups: AdminGroup[] }>('/api/admin/resource/groups'),
        api.get<{ projects: AdminProject[] }>('/api/admin/resource/projects'),
        api.get<{ codes: AdminCode[] }>('/api/admin/resource/codes'),
        api.get<{ contacts: AdminContact[] }>('/api/admin/resource/contacts'),
      ])
      setStats(s)
      setOrg(o.org)
      setUsers(u.users)
      setGroups(g.groups)
      setProjects(p.projects)
      setCodes(c.codes)
      setContacts(k.contacts)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری داده‌ها')
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadAll()
    })()
  }, [loadAll])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900">پنل مدیریت سازمان</h1>
          <p className="text-xs text-slate-500">{org?.name} · کد: <span dir="ltr" className="font-mono">{org?.code}</span></p>
        </div>
        <Button variant="outline" size="icon" onClick={loadAll} className="rounded-xl bg-white" aria-label="بارگذاری مجدد">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} dir="rtl">
        <div className="overflow-x-auto ihms-scroll -mx-1 px-1">
          <TabsList className="h-11 bg-white border border-slate-200 rounded-xl p-1 gap-1 inline-flex min-w-max">
            <TabsTrigger value="dashboard" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <TrendingUp className="w-3.5 h-3.5" /> داشبورد
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Users className="w-3.5 h-3.5" /> کاربران
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <UsersRound className="w-3.5 h-3.5" /> گروه‌ها
            </TabsTrigger>
            <TabsTrigger value="projects" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Building2 className="w-3.5 h-3.5" /> پروژه‌ها
            </TabsTrigger>
            <TabsTrigger value="codes" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <KeyRound className="w-3.5 h-3.5" /> کدها
            </TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <PhoneCall className="w-3.5 h-3.5" /> مخاطبین
            </TabsTrigger>
            <TabsTrigger value="subscription" className="rounded-lg text-xs gap-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Crown className="w-3.5 h-3.5" /> اشتراک
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          {tab === 'dashboard' && <Dashboard stats={stats} />}
          {tab === 'users' && <UsersTab users={users} groups={groups} projects={projects} reload={loadAll} />}
          {tab === 'groups' && <GroupsTab groups={groups} users={users} reload={loadAll} />}
          {tab === 'projects' && <ProjectsTab projects={projects} users={users} reload={loadAll} />}
          {tab === 'codes' && <CodesTab codes={codes} users={users} reload={loadAll} />}
          {tab === 'contacts' && <ContactsTab contacts={contacts} projects={projects} reload={loadAll} />}
          {tab === 'subscription' && <SubscriptionTab org={org} reload={loadAll} />}
        </div>
      </Tabs>
    </div>
  )
}

// ═══════════ داشبورد ═══════════
function Dashboard({ stats }: { stats: Stats | null }) {
  if (!stats) return <div className="py-10 text-center text-sm text-slate-400">در حال بارگذاری...</div>
  const cards = [
    { icon: Users, label: 'کاربران فعال', value: `${faNum(stats.activeUsers)} / ${faNum(stats.totalUsers)}`, color: 'bg-emerald-50 text-emerald-700' },
    { icon: Building2, label: 'پروژه‌ها', value: faNum(stats.totalProjects), color: 'bg-violet-50 text-violet-700' },
    { icon: UsersRound, label: 'گروه‌های اضطراری', value: faNum(stats.totalGroups), color: 'bg-amber-50 text-amber-700' },
    { icon: Megaphone, label: 'کل هشدارها', value: faNum(stats.totalAlerts), color: 'bg-slate-100 text-slate-700' },
    { icon: ShieldCheck, label: 'هشدار فعال', value: faNum(stats.activeAlerts), color: 'bg-red-50 text-red-700' },
    { icon: CheckCheck, label: 'کل تأییدها', value: faNum(stats.totalAcks), color: 'bg-emerald-50 text-emerald-700' },
    { icon: Timer, label: 'میانگین زمان تأیید', value: stats.avgAckMin !== null ? `${faNum(stats.avgAckMin)} دقیقه` : '—', color: 'bg-sky-50 text-sky-700' },
    { icon: CalendarClock, label: 'باقی‌مانده اشتراک', value: `${faNum(stats.daysLeft)} روز`, color: 'bg-rose-50 text-rose-700' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white border border-slate-200 p-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${c.color}`}>
              <c.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-xl font-black text-slate-900">{c.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-700 mb-2">آخرین هشدارها</h3>
        <div className="space-y-2">
          {stats.recentAlerts.map((a) => (
            <div key={a.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center gap-2.5">
              <span className="text-lg">{isIncidentType(a.type) ? INCIDENT_TYPES[a.type].icon : '⚠️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                <p className="text-[10px] text-slate-400">
                  {a.project} · {faDateTime(a.createdAt)} · {a.reportedBy}
                </p>
              </div>
              {a.status === 'ACTIVE' ? (
                <Badge className="bg-red-600 text-white rounded-full text-[10px] shrink-0">فعال</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full text-[10px] shrink-0 bg-slate-50">
                  {faNum(a.ackCount)}/{faNum(a.targetCount)}
                </Badge>
              )}
            </div>
          ))}
          {stats.recentAlerts.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">هنوز هشداری ثبت نشده</p>}
        </div>
      </div>
    </div>
  )
}

// ═══════════ کاربران ═══════════
function UsersTab({
  users, groups, projects, reload,
}: {
  users: AdminUser[]
  groups: AdminGroup[]
  projects: AdminProject[]
  reload: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [query, setQuery] = useState('')

  const filtered = users.filter(
    (u) => !query.trim() || u.fullName.includes(query.trim()) || u.username.includes(query.trim()) || (u.jobTitle || '').includes(query.trim()),
  )

  function openNew() {
    setEditing(null)
    setOpen(true)
  }
  function openEdit(u: AdminUser) {
    setEditing(u)
    setOpen(true)
  }

  async function deactivate(u: AdminUser) {
    if (!confirm(`آیا از غیرفعال‌سازی دسترسی «${u.fullName}» مطمئن هستید؟`)) return
    try {
      await api.del(`/api/admin/resource/users/${u.id}`)
      toast.success('دسترسی کاربر غیرفعال شد')
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="h-11 rounded-xl bg-white border-slate-200 pr-9" placeholder="جستجوی کاربر..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button onClick={openNew} className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 px-4">
          <Plus className="w-4.5 h-4.5" /> کاربر جدید
        </Button>
      </div>

      {filtered.map((u) => (
        <div key={u.id} className={`rounded-2xl bg-white border p-3.5 ${u.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${u.role === 'ADMIN' ? 'bg-slate-900 text-white' : u.canActivate ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
              {u.fullName.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                {u.fullName}
                <Badge variant="outline" className="rounded-full text-[10px]">{ROLE_LABELS[u.role] || u.role}</Badge>
                {u.canActivate && <Badge className="rounded-full text-[10px] bg-red-600 text-white">مجوز فعال‌سازی</Badge>}
                {!u.isActive && <Badge variant="outline" className="rounded-full text-[10px] text-slate-500">غیرفعال</Badge>}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5" dir="ltr" className-dir="">{u.username}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {u.projects.map((p) => (
                  <Badge key={p.id} variant="outline" className="rounded-full text-[10px] bg-violet-50 border-violet-100 text-violet-700">{p.name}</Badge>
                ))}
                {u.groups.map((g) => (
                  <Badge key={g.id} variant="outline" className="rounded-full text-[10px] bg-amber-50 border-amber-100 text-amber-700">{g.name}</Badge>
                ))}
                {u.codes.length > 0 && (
                  <Badge variant="outline" className="rounded-full text-[10px] font-mono bg-emerald-50 border-emerald-100 text-emerald-700" dir="ltr">{u.codes[0]}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-800" aria-label="ویرایش">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {u.isActive && (
                <Button variant="ghost" size="icon" onClick={() => deactivate(u)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600" aria-label="غیرفعال‌سازی">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-8">کاربری یافت نشد</p>}

      {open && (
        <UserFormDialog
          editing={editing}
          groups={groups}
          projects={projects}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false)
            await reload()
            toast.success(editing ? 'کاربر ویرایش شد' : 'کاربر جدید ایجاد شد')
          }}
        />
      )}
    </div>
  )
}

function UserFormDialog({
  editing, groups, projects, onClose, onSaved,
}: {
  editing: AdminUser | null
  groups: AdminGroup[]
  projects: AdminProject[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState({
    username: editing?.username || '',
    password: '',
    fullName: editing?.fullName || '',
    jobTitle: editing?.jobTitle || '',
    personnelCode: editing?.personnelCode || '',
    phone: editing?.phone || '',
    email: editing?.email || '',
    role: editing?.role || 'USER',
    accessLevel: editing?.accessLevel || 'USER',
    canActivate: editing?.canActivate || false,
    isActive: editing?.isActive ?? true,
  })
  const [projectIds, setProjectIds] = useState<string[]>(editing?.projects.map((p) => p.id) || [])
  const [groupIds, setGroupIds] = useState<string[]>(editing?.groups.map((g) => g.id) || [])
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!editing && (!form.username.trim() || !form.fullName.trim() || !form.password)) {
      toast.error('نام کاربری، نام کامل و رمز عبور الزامی است')
      return
    }
    setBusy(true)
    try {
      if (editing) {
        await api.put(`/api/admin/resource/users/${editing.id}`, { ...form, projectIds, groupIds })
      } else {
        await api.post('/api/admin/resource/users', { ...form, projectIds, groupIds })
      }
      await onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90dvh] rounded-2xl p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 py-3.5 border-b bg-slate-50">
          <DialogTitle className="text-base font-black">{editing ? 'ویرایش کاربر' : 'کاربر جدید'}</DialogTitle>
          <DialogDescription className="text-xs">اطلاعات هویتی، نقش، دسترسی، پروژه‌ها و گروه‌ها</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90dvh-130px)] ihms-scroll">
          <div className="px-4 py-4 space-y-3.5">
            {!editing && (
              <Field label="نام کاربری (انگلیسی)">
                <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })} placeholder="a.ahmadi" />
              </Field>
            )}
            <Field label="نام و نام خانوادگی">
              <Input className="h-10 rounded-xl bg-slate-50" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="سمت شغلی">
                <Input className="h-10 rounded-xl bg-slate-50" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="تکنسین برق" />
              </Field>
              <Field label="کد پرسنلی">
                <Input className="h-10 rounded-xl bg-slate-50" value={form.personnelCode} onChange={(e) => setForm({ ...form, personnelCode: e.target.value })} placeholder="ZBP-1042" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="شماره تلفن">
                <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0912xxxxxxx" />
              </Field>
              <Field label="ایمیل">
                <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="a@company.ir" />
              </Field>
            </div>
            <Field label={editing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}>
              <Input dir="ltr" type="text" className="h-10 rounded-xl bg-slate-50 text-left" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="نقش">
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-xl">
                    <SelectItem value="USER">پرسنل</SelectItem>
                    <SelectItem value="DISPATCHER">اعلام‌کننده اضطراری</SelectItem>
                    <SelectItem value="ADMIN">مدیر سیستم</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="سطح دسترسی">
                <Select value={form.accessLevel} onValueChange={(v) => setForm({ ...form, accessLevel: v })}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-xl">
                    <SelectItem value="USER">عادی</SelectItem>
                    <SelectItem value="MANAGER">مدیریتی</SelectItem>
                    <SelectItem value="ADMIN">کامل</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">مجوز فعال‌سازی شرایط اضطراری</span>
                <Switch checked={form.canActivate} onCheckedChange={(v) => setForm({ ...form, canActivate: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">حساب فعال</span>
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </label>
            </div>

            <Field label="پروژه‌های مجاز">
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 max-h-32 overflow-y-auto ihms-scroll">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={projectIds.includes(p.id)} onCheckedChange={(v) => setProjectIds((prev) => (v ? [...prev, p.id] : prev.filter((x) => x !== p.id)))} />
                    <span className="text-slate-700">{p.name}</span>
                  </label>
                ))}
                {projects.length === 0 && <p className="text-xs text-slate-400">پروژه‌ای تعریف نشده</p>}
              </div>
            </Field>

            <Field label="گروه‌های اضطراری">
              <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 max-h-32 overflow-y-auto ihms-scroll">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={groupIds.includes(g.id)} onCheckedChange={(v) => setGroupIds((prev) => (v ? [...prev, g.id] : prev.filter((x) => x !== g.id)))} />
                    <span className="text-slate-700">{GROUP_KINDS[g.kind as keyof typeof GROUP_KINDS]?.icon ?? '📌'} {g.name}</span>
                  </label>
                ))}
                {groups.length === 0 && <p className="text-xs text-slate-400">گروهی تعریف نشده</p>}
              </div>
            </Field>
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره
          </Button>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-xl px-6 bg-white">انصراف</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════ گروه‌ها ═══════════
function GroupsTab({ groups, users, reload }: { groups: AdminGroup[]; users: AdminUser[]; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminGroup | null>(null)

  async function remove(g: AdminGroup) {
    if (g.isSystem) return toast.error('گروه‌های سیستمی قابل حذف نیستند')
    if (!confirm(`حذف گروه «${g.name}»؟`)) return
    try {
      await api.del(`/api/admin/resource/groups/${g.id}`)
      await reload()
      toast.success('گروه حذف شد')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
        className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5"
      >
        <Plus className="w-4.5 h-4.5" /> تعریف گروه جدید
      </Button>

      {groups.map((g) => {
        const k = GROUP_KINDS[g.kind as keyof typeof GROUP_KINDS]
        return (
          <div key={g.id} className="rounded-2xl bg-white border border-slate-200 p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${g.color}15` }}>
                {k?.icon ?? '📌'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900">{g.name}</p>
                <p className="text-[11px] text-slate-400">
                  {k?.label || 'گروه سفارشی'} · {faNum(g.members.length)} عضو {g.isSystem && '· سیستمی'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-500"
                  aria-label="ویرایش"
                  onClick={() => {
                    setEditing(g)
                    setOpen(true)
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {!g.isSystem && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600" aria-label="حذف" onClick={() => remove(g)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {g.members.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {g.members.map((m) => (
                  <Badge key={m.id} variant="outline" className="rounded-full text-[10px] bg-slate-50">
                    {m.fullName}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {open && (
        <GroupFormDialog
          editing={editing}
          users={users}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false)
            await reload()
            toast.success('گروه ذخیره شد')
          }}
        />
      )}
    </div>
  )
}

function GroupFormDialog({
  editing, users, onClose, onSaved,
}: {
  editing: AdminGroup | null
  users: AdminUser[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    kind: editing?.kind || 'CUSTOM',
    description: editing?.description || '',
    color: editing?.color || '#db2777',
  })
  const [memberIds, setMemberIds] = useState<string[]>(editing?.members.map((m) => m.id) || [])
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!form.name.trim()) return toast.error('نام گروه الزامی است')
    setBusy(true)
    try {
      if (editing) await api.put(`/api/admin/resource/groups/${editing.id}`, { ...form, memberIds })
      else await api.post('/api/admin/resource/groups', { ...form, memberIds })
      await onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  const systemKinds = editing?.isSystem ? [editing.kind] : Object.keys(GROUP_KINDS)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 py-3.5 border-b bg-slate-50">
          <DialogTitle className="text-base font-black">{editing ? 'ویرایش گروه' : 'گروه جدید'}</DialogTitle>
          <DialogDescription className="text-xs">گروه‌ها مبنای اطلاع‌رسانی هوشمند هستند</DialogDescription>
        </DialogHeader>
        <div className="px-4 py-4 space-y-3.5">
          <Field label="نام گروه">
            <Input className="h-10 rounded-xl bg-slate-50" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: تیم اطفای حریق نوبت شب" />
          </Field>
          <Field label="نوع گروه (مبنای انتخاب هوشمند)">
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })} disabled={!!editing?.isSystem}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl" className="rounded-xl">
                {systemKinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {GROUP_KINDS[k as keyof typeof GROUP_KINDS].icon} {GROUP_KINDS[k as keyof typeof GROUP_KINDS].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="توضیحات">
            <Textarea className="rounded-xl bg-slate-50 min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label={`اعضا (${memberIds.length} نفر)`}>
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 max-h-48 overflow-y-auto ihms-scroll">
              {users.filter((u) => u.isActive).map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={memberIds.includes(u.id)}
                    onCheckedChange={(v) => setMemberIds((prev) => (v ? [...prev, u.id] : prev.filter((x) => x !== u.id)))}
                  />
                  <span className="text-slate-700">{u.fullName}</span>
                  <span className="text-[10px] text-slate-400">{u.jobTitle || ''}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره گروه
          </Button>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-xl px-6 bg-white">انصراف</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════ پروژه‌ها ═══════════
function ProjectsTab({ projects, users, reload }: { projects: AdminProject[]; users: AdminUser[]; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProject | null>(null)

  return (
    <div className="space-y-3">
      <Button
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
        className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5"
      >
        <Plus className="w-4.5 h-4.5" /> پروژه جدید
      </Button>

      {projects.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white border border-slate-200 p-3.5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-900">{p.name}</p>
            <p className="text-[11px] text-slate-400">
              {p.location || 'بدون موقعیت'} · {faNum(p.users.length)} پرسنل · {faNum(p._count.alerts)} هشدار
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {p.users.slice(0, 6).map((u) => (
                <Badge key={u.user.id} variant="outline" className="rounded-full text-[10px] bg-slate-50">{u.user.fullName}</Badge>
              ))}
              {p.users.length > 6 && <Badge variant="outline" className="rounded-full text-[10px] bg-slate-50">+{faNum(p.users.length - 6)}</Badge>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-500 shrink-0"
            aria-label="ویرایش"
            onClick={() => {
              setEditing(p)
              setOpen(true)
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}

      {open && (
        <ProjectFormDialog
          editing={editing}
          users={users}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false)
            await reload()
            toast.success('پروژه ذخیره شد')
          }}
        />
      )}
    </div>
  )
}

function ProjectFormDialog({
  editing, users, onClose, onSaved,
}: {
  editing: AdminProject | null
  users: AdminUser[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    location: editing?.location || '',
    description: editing?.description || '',
    isActive: editing?.isActive ?? true,
  })
  const [userIds, setUserIds] = useState<string[]>(editing?.users.map((u) => u.user.id) || [])
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!form.name.trim()) return toast.error('نام پروژه الزامی است')
    setBusy(true)
    try {
      if (editing) await api.put(`/api/admin/resource/projects/${editing.id}`, { ...form, userIds })
      else await api.post('/api/admin/resource/projects', { ...form, userIds })
      await onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 py-3.5 border-b bg-slate-50">
          <DialogTitle className="text-base font-black">{editing ? 'ویرایش پروژه' : 'پروژه جدید'}</DialogTitle>
          <DialogDescription className="text-xs">پرسنل پروژه، گیرندگان گروه «کلیه پرسنل» هستند</DialogDescription>
        </DialogHeader>
        <div className="px-4 py-4 space-y-3.5">
          <Field label="نام پروژه">
            <Input className="h-10 rounded-xl bg-slate-50" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: واحد تولید الف" />
          </Field>
          <Field label="موقعیت / آدرس سایت">
            <Input className="h-10 rounded-xl bg-slate-50" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="مثال: شهرک صنعتی — سایت ۲" />
          </Field>
          <Field label="توضیحات">
            <Textarea className="rounded-xl bg-slate-50 min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label={`پرسنل پروژه (${userIds.length} نفر)`}>
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 max-h-48 overflow-y-auto ihms-scroll">
              {users.filter((u) => u.isActive).map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={userIds.includes(u.id)} onCheckedChange={(v) => setUserIds((prev) => (v ? [...prev, u.id] : prev.filter((x) => x !== u.id)))} />
                  <span className="text-slate-700">{u.fullName}</span>
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-700">پروژه فعال</span>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </label>
        </div>
        <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره پروژه
          </Button>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-xl px-6 bg-white">انصراف</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════ کدهای فعال‌سازی ═══════════
function CodesTab({ codes, users, reload }: { codes: AdminCode[]; users: AdminUser[]; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function revoke(c: AdminCode) {
    if (!confirm(`حذف کد «${c.code}»؟ کاربر متصل به کد، دیگر با آن وارد نمی‌شود.`)) return
    setBusyId(c.id)
    try {
      await api.del(`/api/admin/resource/codes/${c.id}`)
      await reload()
      toast.success('کد حذف شد')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)} className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5">
        <Plus className="w-4.5 h-4.5" /> صدور کد فعال‌سازی
      </Button>

      <p className="text-[11px] text-slate-500 leading-5 rounded-xl bg-amber-50 border border-amber-200 p-3">
        کد فعال‌سازی جایگزین ورود با رمز عبور است: پرسنل می‌توانند فقط با وارد کردن کد، بدون نام کاربری وارد شوند. هر کد به یک کاربر متصل می‌شود.
      </p>

      {codes.map((c) => (
        <div key={c.id} className="rounded-2xl bg-white border border-slate-200 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-slate-900 font-mono" dir="ltr">{c.code}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {c.label || 'بدون برچسب'} · {c.user?.fullName || 'بدون کاربر'}
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className={`rounded-full text-[10px] ${c.isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {c.isActive ? 'فعال' : 'لغوشده'}
              </Badge>
              {c.usedAt ? (
                <Badge variant="outline" className="rounded-full text-[10px] bg-slate-50">استفاده: {faDate(c.usedAt)}</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full text-[10px] bg-amber-50 border-amber-100 text-amber-700">بلااستفاده</Badge>
              )}
              {c.canActivate && <Badge className="rounded-full text-[10px] bg-red-600 text-white">مجوز فعال‌سازی</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => revoke(c)} disabled={busyId === c.id} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 shrink-0" aria-label="حذف کد">
            {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      ))}
      {codes.length === 0 && <p className="text-center text-sm text-slate-400 py-8">کدی صادر نشده است</p>}

      {open && (
        <CodeFormDialog users={users} onClose={() => setOpen(false)} onSaved={async () => {
          setOpen(false)
          await reload()
          toast.success('کد صادر شد')
        }} />
      )}
    </div>
  )
}

function CodeFormDialog({ users, onClose, onSaved }: { users: AdminUser[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    code: '',
    label: '',
    userId: '',
    role: 'USER',
    canActivate: false,
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const res = await api.post<{ code: string }>('/api/admin/resource/codes', {
        ...form,
        userId: form.userId || null,
      })
      await onSaved()
      toast.success(`کد «${res.code}» صادر شد`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 py-3.5 border-b bg-slate-50">
          <DialogTitle className="text-base font-black">صدور کد فعال‌سازی</DialogTitle>
          <DialogDescription className="text-xs">در صورت خالی گذاشتن، کد تصادفی تولید می‌شود</DialogDescription>
        </DialogHeader>
        <div className="px-4 py-4 space-y-3.5">
          <Field label="کد (اختیاری)">
            <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left font-mono uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="IHMS-XXXXXX" />
          </Field>
          <Field label="برچسب">
            <Input className="h-10 rounded-xl bg-slate-50" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثال: کد تیم آتش‌نشانی نوبت روز" />
          </Field>
          <Field label="کاربر متصل">
            <Select value={form.userId || 'NONE'} onValueChange={(v) => setForm({ ...form, userId: v === 'NONE' ? '' : v })}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl" className="rounded-xl max-h-64">
                <SelectItem value="NONE">— انتخاب کاربر —</SelectItem>
                {users.filter((u) => u.isActive).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} ({u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-700">دارای مجوز فعال‌سازی اضطراری</span>
            <Switch checked={form.canActivate} onCheckedChange={(v) => setForm({ ...form, canActivate: v })} />
          </label>
        </div>
        <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            صدور کد
          </Button>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-xl px-6 bg-white">انصراف</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════ مخاطبین ═══════════
function ContactsTab({ contacts, projects, reload }: { contacts: AdminContact[]; projects: AdminProject[]; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminContact | null>(null)

  async function remove(c: AdminContact) {
    if (!confirm(`حذف مخاطب «${c.name}»؟`)) return
    try {
      await api.del(`/api/admin/resource/contacts/${c.id}`)
      await reload()
      toast.success('حذف شد')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
        className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5"
      >
        <Plus className="w-4.5 h-4.5" /> مخاطب اضطراری جدید
      </Button>

      {contacts.map((c) => (
        <div key={c.id} className="rounded-2xl bg-white border border-slate-200 p-3.5 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.isEmergency ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-900">{c.name}</p>
            <p className="text-[11px] text-slate-500">{c.title} · {CATEGORY_LABELS[c.category] || c.category}</p>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5" dir="ltr">{c.phone}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500" aria-label="ویرایش" onClick={() => {
              setEditing(c)
              setOpen(true)
            }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600" aria-label="حذف" onClick={() => remove(c)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
      {contacts.length === 0 && <p className="text-center text-sm text-slate-400 py-8">مخاطبی ثبت نشده</p>}

      {open && (
        <ContactFormDialog
          editing={editing}
          projects={projects}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false)
            await reload()
            toast.success('مخاطب ذخیره شد')
          }}
        />
      )}
    </div>
  )
}

function ContactFormDialog({
  editing, projects, onClose, onSaved,
}: {
  editing: AdminContact | null
  projects: AdminProject[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    title: editing?.title || '',
    phone: editing?.phone || '',
    phone2: editing?.phone2 || '',
    email: editing?.email || '',
    category: editing?.category || 'OTHER',
    isEmergency: editing?.isEmergency || false,
    priority: editing?.priority || 0,
    projectId: editing ? (editing.project ? undefined : '') : '',
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!form.name.trim() || !form.phone.trim()) return toast.error('نام و شماره تلفن الزامی است')
    setBusy(true)
    try {
      if (editing) await api.put(`/api/admin/resource/contacts/${editing.id}`, form)
      else await api.post('/api/admin/resource/contacts', form)
      await onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 py-3.5 border-b bg-slate-50">
          <DialogTitle className="text-base font-black">{editing ? 'ویرایش مخاطب' : 'مخاطب جدید'}</DialogTitle>
          <DialogDescription className="text-xs">مسئولان و تیم‌های اضطراری سازمان</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70dvh] ihms-scroll">
          <div className="px-4 py-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="نام">
                <Input className="h-10 rounded-xl bg-slate-50" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="داود جورکش" />
              </Field>
              <Field label="سمت">
                <Input className="h-10 rounded-xl bg-slate-50" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مدیر HSE" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="تلفن اصلی">
                <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0912xxxxxxx" />
              </Field>
              <Field label="تلفن دوم">
                <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
              </Field>
            </div>
            <Field label="ایمیل">
              <Input dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="دسته">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-xl">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="اولویت نمایش">
                <Input type="number" className="h-10 rounded-xl bg-slate-50" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </Field>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-semibold text-slate-700">مخاطب اضطراری (نمایش پررنگ)</span>
              <Switch checked={form.isEmergency} onCheckedChange={(v) => setForm({ ...form, isEmergency: v })} />
            </label>
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره
          </Button>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-xl px-6 bg-white">انصراف</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════ اشتراک ═══════════
function SubscriptionTab({ org, reload }: { org: OrgInfo | null; reload: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('PRO')
  const [maxUsers, setMaxUsers] = useState(100)
  const [expiry, setExpiry] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (org) {
      setName(org.name)
      setPlan(org.plan)
      setMaxUsers(org.maxUsers)
      setIsActive(org.isActive)
      setExpiry(new Date(org.subscriptionEndsAt).toISOString().slice(0, 10))
    }
  }, [org])

  if (!org) return <div className="py-10 text-center text-sm text-slate-400">در حال بارگذاری...</div>

  const daysLeft = Math.ceil((new Date(org.subscriptionEndsAt).getTime() - Date.now()) / 86400000)

  async function save() {
    setBusy(true)
    try {
      await api.put('/api/admin/org', { name, plan, maxUsers, isActive, subscriptionEndsAt: expiry })
      await reload()
      toast.success('اطلاعات اشتراک به‌روزرسانی شد')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border-2 p-4 ${daysLeft > 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${daysLeft > 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
            <Crown className="w-5.5 h-5.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900">اشتراک {org.plan}</p>
            <p className="text-xs text-slate-600">
              {daysLeft > 0 ? `${faNum(daysLeft)} روز باقی‌مانده — تا ${faDate(org.subscriptionEndsAt)}` : 'منقضی شده — ورود کاربران مسدود است'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3.5">
        <Field label="نام سازمان">
          <Input className="h-10 rounded-xl bg-slate-50" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="پلن">
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl" className="rounded-xl">
                <SelectItem value="BASIC">پایه</SelectItem>
                <SelectItem value="PRO">حرفه‌ای</SelectItem>
                <SelectItem value="ENTERPRISE">سازمانی</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="سقف کاربران">
            <Input type="number" className="h-10 rounded-xl bg-slate-50" value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="تاریخ پایان اشتراک">
          <Input type="date" dir="ltr" className="h-10 rounded-xl bg-slate-50 text-left" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </Field>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <span className="text-sm font-semibold text-slate-700">سازمان فعال</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </label>
        <Button onClick={save} disabled={busy} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          ذخیره تغییرات اشتراک
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: 'کاربران', v: org._count.users },
          { l: 'پروژه‌ها', v: org._count.projects },
          { l: 'گروه‌ها', v: org._count.groups },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white border border-slate-200 p-3 text-center">
            <p className="text-lg font-black text-slate-900">{faNum(s.v)}</p>
            <p className="text-[10px] text-slate-400">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
    </div>
  )
}
