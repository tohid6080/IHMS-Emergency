'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { INCIDENT_TYPES, ALERT_LEVELS, isIncidentType, isAlertLevel } from '@/lib/constants'
import { api, faTime, faRelative, faNum, type AlertDetail, type RecipientRow } from '@/lib/client-api'
import { Siren, Phone, CheckCircle2, Clock, VolumeX, Users, MapPin, Square, RefreshCw, Search, CircleAlert } from 'lucide-react'

interface Props {
  open: boolean
  alertId: string
  onClose: () => void
  /** رویداد زنده تأیید از سوکت برای به‌روزرسانی فوری */
  liveAcks?: { alertId: string; userId: string; ackAt: string }[]
  onEnded: () => void
}

export function MonitorSheet({ open, alertId, onClose, liveAcks, onEnded }: Props) {
  const [detail, setDetail] = useState<AlertDetail | null>(null)
  const [recipients, setRecipients] = useState<RecipientRow[]>([])
  const [query, setQuery] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [endedInfo, setEndedInfo] = useState<string | null>(null)
  const liveAcksRef = useRef(liveAcks)
  liveAcksRef.current = liveAcks

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ alert: AlertDetail; recipients: RecipientRow[]; ackCount: number; targetCount: number }>(
        `/api/alerts/${alertId}`,
      )
      setDetail(res.alert)
      setRecipients(res.recipients.sort((a, b) => (a.ackAt ? 0 : 1) - (b.ackAt ? 0 : 1)))
    } catch {
      // alert might be gone
    } finally {
      setLoading(false)
    }
  }, [alertId])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    load()
    const t = setInterval(load, 7000)
    return () => clearInterval(t)
  }, [open, load])

  // به‌روزرسانی فوری با رویداد سوکت
  useEffect(() => {
    const list = liveAcksRef.current
    if (!list || list.length === 0 || !detail) return
    const latest = list[list.length - 1]
    if (latest.alertId !== detail.id) return
    setRecipients((prev) =>
      prev.map((r) => (r.id === latest.userId && !r.ackAt ? { ...r, ackAt: latest.ackAt } : r)).sort((a, b) => (a.ackAt ? 0 : 1) - (b.ackAt ? 0 : 1)),
    )
  }, [liveAcks, detail])

  async function endEmergency() {
    if (!detail) return
    setBusy(true)
    try {
      await api.post(`/api/alerts/${detail.id}/end`)
      setConfirmEnd(false)
      onEnded()
      onClose()
    } catch {
      toastSafe('خطا در پایان وضعیت اضطراری')
    } finally {
      setBusy(false)
    }
  }

  function toastSafe(msg: string) {
    import('sonner').then(({ toast }) => toast.error(msg))
  }

  const acked = recipients.filter((r) => r.ackAt)
  const pending = recipients.filter((r) => !r.ackAt)
  const mutedNoAck = pending.filter((r) => r.mutedAt && !r.ackAt)
  const pct = recipients.length ? Math.round((acked.length / recipients.length) * 100) : 0

  const filtered = (arr: RecipientRow[]) =>
    query.trim() ? arr.filter((r) => r.fullName.includes(query.trim()) || (r.jobTitle || '').includes(query.trim())) : arr

  const typeInfo = detail && isIncidentType(detail.type) ? INCIDENT_TYPES[detail.type] : INCIDENT_TYPES.OTHER
  const levelInfo = detail && isAlertLevel(detail.level) ? ALERT_LEVELS[detail.level] : ALERT_LEVELS.LEVEL_2

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[94dvh] p-0 rounded-2xl gap-0 overflow-hidden flex flex-col" dir="rtl" aria-describedby={undefined}>
        {loading || !detail ? (
          <div className="flex items-center justify-center py-16">
            <DialogTitle className="sr-only">پایش زنده هشدار</DialogTitle>
            <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : detail.status === 'ENDED' || endedInfo ? (
          <div className="py-12 px-6 text-center">
            <DialogTitle className="sr-only">پایان شرایط اضطراری</DialogTitle>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-black text-lg text-slate-900">شرایط اضطراری پایان یافت</h2>
            <p className="text-sm text-slate-500 mt-2">
              وضعیت حادثه «{detail.title}» با موفقیت بسته شد و صفحه قرمز از گوشی گیرندگان حذف شد.
            </p>
            <Button onClick={onClose} className="mt-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-8">
              بستن
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="px-4 py-3.5 border-b flex-row items-center gap-2.5 space-y-0 bg-gradient-to-l from-red-50 to-transparent">
              <div className="w-10 h-10 rounded-xl bg-red-600 ihms-siren-pulse flex items-center justify-center shrink-0">
                <Siren className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-black text-slate-900 truncate">
                  {typeInfo.icon} {detail.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {detail.location}
                  <span className="text-red-600 font-bold">{levelInfo.short}</span>
                </DialogDescription>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 max-h-[calc(94dvh-210px)] ihms-scroll">
              <div className="px-4 py-4 space-y-4">
                {/* وضعیت زنده */}
                <div className="rounded-2xl border-2 border-red-100 bg-red-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-red-600" />
                      تأیید دریافت هشدار
                    </span>
                    <span className="text-2xl font-black text-red-600">
                      {faNum(acked.length)}
                      <span className="text-sm text-slate-400 font-medium"> / {faNum(recipients.length)}</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-2.5 bg-red-100 [&>div]:bg-red-600" />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>{faNum(pct)}٪ گیرندگان تأیید کرده‌اند</span>
                    {mutedNoAck.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <VolumeX className="w-3 h-3" />
                        {faNum(mutedNoAck.length)} نفر آژیر را ساکت کرده‌اند
                      </span>
                    )}
                  </div>
                </div>

                {/* جستجو */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 pr-9 text-sm"
                    placeholder="جستجوی نام یا سمت..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {/* تأیید کرده‌اند */}
                {filtered(acked).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تأیید شده ({faNum(filtered(acked).length)})
                    </p>
                    {filtered(acked).map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl bg-emerald-50/60 border border-emerald-100 p-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {r.fullName.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {r.fullName}
                            {r.groups.length > 0 && (
                              <Badge variant="outline" className="mr-1.5 text-[10px] h-5 rounded-full border-emerald-200 text-emerald-700 font-normal">
                                {r.groups[0]}
                              </Badge>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">{r.jobTitle || 'پرسنل'}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {faTime(r.ackAt!)}
                          </p>
                          {r.phone && (
                            <a href={`tel:${r.phone}`} dir="ltr" className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 justify-end">
                              <Phone className="w-2.5 h-2.5" />
                              {r.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* هنوز تأیید نکرده‌اند */}
                {filtered(pending).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <CircleAlert className="w-3.5 h-3.5" />
                      در انتظار تأیید ({faNum(filtered(pending).length)})
                    </p>
                    {filtered(pending).map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {r.fullName.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{r.fullName}</p>
                          <p className="text-[11px] text-slate-400">{r.jobTitle || 'پرسنل'}</p>
                        </div>
                        {r.mutedAt ? (
                          <Badge variant="outline" className="text-[10px] h-6 rounded-full border-amber-200 bg-amber-50 text-amber-700 gap-0.5 shrink-0">
                            <VolumeX className="w-3 h-3" />
                            ساکت
                          </Badge>
                        ) : (
                          <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {recipients.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-6">گیرنده‌ای ثبت نشده است</p>
                )}
              </div>
            </ScrollArea>

            <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
              <Button
                onClick={() => setConfirmEnd(true)}
                className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black"
              >
                <Square className="w-4.5 h-4.5 fill-current" />
                پایان شرایط اضطراری
              </Button>
              <Button variant="outline" onClick={onClose} className="h-12 rounded-xl px-5 bg-white">
                بستن
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent dir="rtl" className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="text-center items-center">
            <AlertDialogTitle className="text-base font-black">پایان شرایط اضطراری</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6">
              آیا مطمئن هستید وضعیت اضطراری کنترل شده است؟ با تأیید، صفحه قرمز و آژیر تمام گیرندگان متوقف می‌شود و هشدار به تاریخچه منتقل می‌گردد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-center">
            <AlertDialogCancel className="rounded-xl mt-0">انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                endEmergency()
              }}
              disabled={busy}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 font-bold"
            >
              بله، وضعیت پایان یافت
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
