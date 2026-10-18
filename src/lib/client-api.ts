'use client'

// ─────────────────────────────────────────────
// کلاینت API + تایپ‌های مشترک
// ─────────────────────────────────────────────

export interface MyUser {
  id: string
  organizationId: string
  username: string
  fullName: string
  jobTitle: string | null
  phone: string | null
  email: string | null
  role: 'ADMIN' | 'DISPATCHER' | 'USER' | string
  accessLevel: string
  canActivate: boolean
  organization: {
    id: string
    name: string
    code: string
    subscriptionEndsAt: string
    isActive: boolean
    plan: string
    maxUsers: number
  }
  projects: { id: string; name: string; location: string | null }[]
}

export interface ActiveAlert {
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
  project: { name: string } | null
  reportedBy?: { fullName: string } | null
  reportedByName?: string
  isMine?: boolean
  isTarget?: boolean
  myAck?: { userId: string; acknowledgedAt: string; mutedAt?: string | null } | null
  targetCount?: number
  ackCount?: number
}

export interface AlertDetail extends ActiveAlert {
  status: string
  endedAt: string | null
  canEnd: boolean
}

export interface RecipientRow {
  id: string
  fullName: string
  jobTitle: string | null
  phone: string | null
  role: string
  groups: string[]
  ackAt: string | null
  mutedAt: string | null
}

export interface GroupInfo {
  id: string
  name: string
  kind: string
  description: string | null
  color: string
  isSystem: boolean
  members: { id: string; fullName: string; jobTitle: string | null; phone: string | null; roleInGroup: string | null }[]
}

export interface ProjectInfo {
  id: string
  name: string
  location: string | null
  description: string | null
  isActive: boolean
}

export interface ContactInfo {
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
  projectId: string | null
}

export interface BootstrapData {
  user: MyUser
  groups: GroupInfo[]
  projects: ProjectInfo[]
  contacts: ContactInfo[]
  activeAlerts: ActiveAlert[]
  subscriptionExpired: boolean
}

export interface HistoryAlert {
  id: string
  code: string
  type: string
  level: string
  title: string
  location: string
  status: string
  createdAt: string
  endedAt: string | null
  project: { name: string } | null
  reportedBy: { fullName: string } | null
  targetCount: number
  ackCount: number
  durationMin: number | null
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new ApiError('نشست شما منقضی شده است. دوباره وارد شوید.', 401)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'خطای ناشناخته', res.status, data.code)
  return data as T
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(msg: string, status: number, code?: string) {
    super(msg)
    this.status = status
    this.code = code
  }
}

export const api = {
  get: <T,>(url: string) => fetch(url, { cache: 'no-store' }).then((r) => handle<T>(r)),
  post: <T,>(url: string, body?: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handle<T>(r)),
  put: <T,>(url: string, body?: unknown) =>
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handle<T>(r)),
  del: <T,>(url: string) => fetch(url, { method: 'DELETE' }).then((r) => handle<T>(r)),
}

// ─── قالب تاریخ فارسی ───
const dtf = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const tf = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' })
const df = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })

export const faDateTime = (iso: string | Date) => dtf.format(new Date(iso))
export const faTime = (iso: string | Date) => tf.format(new Date(iso))
export const faDate = (iso: string | Date) => df.format(new Date(iso))

export function faRelative(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'هم‌اکنون'
  if (m < 60) return `${new Intl.NumberFormat('fa-IR').format(m)} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${new Intl.NumberFormat('fa-IR').format(h)} ساعت پیش`
  const d = Math.floor(h / 24)
  return `${new Intl.NumberFormat('fa-IR').format(d)} روز پیش`
}

export const faNum = (n: number | string) => new Intl.NumberFormat('fa-IR').format(Number(n))
