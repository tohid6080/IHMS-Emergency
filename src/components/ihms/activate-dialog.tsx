'use client'

import { useMemo, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Siren, Loader2, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { INCIDENT_TYPES, ALERT_LEVELS, SMART_DISPATCH, DEFAULT_INSTRUCTIONS, GROUP_KINDS } from '@/lib/constants'
import { api, type ProjectInfo, type GroupInfo, type ActiveAlert } from '@/lib/client-api'

interface Props {
  open: boolean
  onClose: () => void
  projects: ProjectInfo[]
  groups: GroupInfo[]
  defaultProjectId?: string
  onActivated: (alert: { id: string } & ActiveAlert) => void
}

export function ActivateDialog({ open, onClose, projects, groups, defaultProjectId, onActivated }: Props) {
  const [type, setType] = useState<string>('FIRE')
  const [level, setLevel] = useState<string>('LEVEL_2')
  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || '')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupsTouched, setGroupsTouched] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  // گروه‌های پیش‌فرض بر اساس نوع حادثه (اطلاع‌رسانی هوشمند)
  const smartGroupIds = useMemo(() => {
    const kinds = SMART_DISPATCH[type as keyof typeof SMART_DISPATCH] || ['HSE']
    return groups.filter((g) => kinds.includes(g.kind as keyof typeof GROUP_KINDS)).map((g) => g.id)
  }, [type, groups])

  const effectiveGroups = groupsTouched ? selectedGroups : smartGroupIds

  function toggleGroup(id: string) {
    setGroupsTouched(true)
    setSelectedGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  function reset() {
    setType('FIRE')
    setLevel('LEVEL_2')
    setProjectId(defaultProjectId || projects[0]?.id || '')
    setTitle('')
    setLocation('')
    setDescription('')
    setInstructions('')
    setSelectedGroups([])
    setGroupsTouched(false)
  }

  async function activate() {
    if (!title.trim()) return toast.error('عنوان حادثه را وارد کنید')
    if (!location.trim()) return toast.error('محل وقوع را وارد کنید')
    if (!projectId) return toast.error('پروژه را انتخاب کنید')
    if (effectiveGroups.length === 0) return toast.error('حداقل یک گروه هدف انتخاب کنید')
    setBusy(true)
    try {
      const res = await api.post<{ ok: boolean; alert: { id: string }; targetCount: number }>('/api/alerts', {
        type,
        level,
        projectId,
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        targetGroups: effectiveGroups,
      })
      setConfirming(false)
      reset()
      onClose()
      const created = {
        id: res.alert.id,
        type,
        level,
        title: title.trim(),
        location: location.trim(),
        createdAt: new Date().toISOString(),
        project: { name: projects.find((p) => p.id === projectId)?.name || '' },
      }
      onActivated(created)
      toast.success(`شرایط اضطراری فعال شد — اطلاع‌رسانی به ${res.targetCount} نفر`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در فعال‌سازی')
    } finally {
      setBusy(false)
    }
  }

  const typeInfo = INCIDENT_TYPES[type as keyof typeof INCIDENT_TYPES]

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md max-h-[92dvh] p-0 rounded-2xl gap-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-4 py-3.5 border-b bg-slate-50 flex-row items-center gap-2.5 space-y-0">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
              <Siren className="w-5.5 h-5.5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-black text-slate-900">فعال‌سازی شرایط اضطراری</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                هشدار به‌صورت لحظه‌ای برای گروه‌های انتخابی ارسال می‌شود
              </DialogDescription>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(92dvh-140px)]">
            <div className="px-4 py-4 space-y-4">
              {/* نوع حادثه */}
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">نوع حادثه</Label>
                <Select value={type} onValueChange={(v) => setType(v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl" dir="rtl">
                    {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.icon} {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* سطح حادثه */}
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">سطح اضطرار</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(ALERT_LEVELS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLevel(k)}
                      className={`rounded-xl border-2 p-2.5 text-right transition-all ${
                        level === k ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-[13px] font-bold text-slate-800">{v.short}</span>
                      <span className="block text-[10px] text-slate-500 leading-4 mt-0.5 line-clamp-2">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* پروژه */}
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">پروژه / واحد سازمانی</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="انتخاب پروژه" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl" dir="rtl">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* عنوان و محل */}
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">عنوان حادثه</Label>
                <Input
                  className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  placeholder="مثال: حریق در سالن تولید"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">محل وقوع دقیق</Label>
                <Input
                  className="h-11 rounded-xl bg-slate-50 border-slate-200"
                  placeholder="مثال: سالن تولید — خط ۲، ضلع شرقی"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* شرح */}
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">
                  شرح حادثه <span className="text-slate-400 text-xs">(اختیاری)</span>
                </Label>
                <Textarea
                  className="rounded-xl bg-slate-50 border-slate-200 min-h-20"
                  placeholder="شرح مختصر وضعیت، تعداد مصدومان، خطرات ثانویه..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* دستورالعمل */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700">
                    دستورالعمل اضطراری <span className="text-slate-400 text-xs">(اختیاری)</span>
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-red-600 font-semibold hover:underline"
                    onClick={() => setInstructions(DEFAULT_INSTRUCTIONS[type as keyof typeof DEFAULT_INSTRUCTIONS] || '')}
                  >
                    درج متن پیش‌فرض
                  </button>
                </div>
                <Textarea
                  className="rounded-xl bg-slate-50 border-slate-200 min-h-24"
                  placeholder="دستورات فوری برای گیرندگان هشدار..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              {/* گروه‌های هدف */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    گروه‌های هدف
                  </Label>
                  {groupsTouched && (
                    <button
                      type="button"
                      className="text-xs text-red-600 font-semibold hover:underline"
                      onClick={() => {
                        setGroupsTouched(false)
                        setSelectedGroups([])
                      }}
                    >
                      بازگشت به انتخاب هوشمند
                    </button>
                  )}
                </div>
                {groupsTouched && selectedGroups.length === 0 && (
                  <p className="text-[11px] text-red-500">هیچ گروهی انتخاب نشده — حداقل یک گروه لازم است</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g) => {
                    const on = effectiveGroups.includes(g.id)
                    return (
                      <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}>
                        <Badge
                          variant="outline"
                          className={`cursor-pointer h-8 px-3 rounded-full text-xs transition-all ${
                            on ? 'bg-red-600 border-red-600 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {GROUP_KINDS[g.kind as keyof typeof GROUP_KINDS]?.icon ?? '📌'} {g.name}
                          <span className="mr-1 opacity-70">({g.members.length})</span>
                        </Badge>
                      </button>
                    )
                  })}
                </div>
                {!groupsTouched && (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <Checkbox checked readOnly className="w-3 h-3 pointer-events-none" />
                    انتخاب هوشمند بر اساس نوع حادثه «{typeInfo.label}» فعال است
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
            <Button
              onClick={() => setConfirming(true)}
              className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-base shadow-lg shadow-red-200"
            >
              <Siren className="w-5 h-5" />
              فعال‌سازی شرایط اضطراری
            </Button>
            <Button variant="outline" onClick={onClose} className="h-12 rounded-xl px-6 bg-white">
              انصراف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأیید نهایی */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent dir="rtl" className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-1">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <AlertDialogTitle className="text-base font-black">تأیید فعال‌سازی شرایط اضطراری</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6">
              آیا از فعال‌سازی شرایط اضطراری «{title || typeInfo.label}» در پروژه انتخابی مطمئن هستید؟
              <br />
              این عملیات بلافاصله هشدار صوتی و نوتیفیکیشن برای گروه‌های هدف ارسال می‌کند و قابل لغو فوری نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-center">
            <AlertDialogCancel className="rounded-xl mt-0">انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                activate()
              }}
              disabled={busy}
              className="rounded-xl bg-red-600 hover:bg-red-700 font-bold"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بله، فعال‌سازی کن'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
