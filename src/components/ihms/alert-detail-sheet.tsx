'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { INCIDENT_TYPES, ALERT_LEVELS, isIncidentType, isAlertLevel } from '@/lib/constants'
import { api, faDateTime, faTime, faNum, type AlertDetail, type RecipientRow } from '@/lib/client-api'
import { CheckCircle2, Clock, VolumeX, Phone, Siren, Square, ClipboardList, MapPin, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  alertId: string | null
  onClose: () => void
  /** اگر کاربر مجاز به پایان دادن باشد دکمه نمایش داده شود */
  onMonitor?: (alertId: string) => void
}

export function AlertDetailSheet({ open, alertId, onClose, onMonitor }: Props) {
  const [detail, setDetail] = useState<AlertDetail | null>(null)
  const [recipients, setRecipients] = useState<RecipientRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!alertId) return
    setLoading(true)
    try {
      const res = await api.get<{ alert: AlertDetail; recipients: RecipientRow[] }>(`/api/alerts/${alertId}`)
      setDetail(res.alert)
      setRecipients(res.recipients.sort((a, b) => (a.ackAt ? 0 : 1) - (b.ackAt ? 0 : 1)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در دریافت جزئیات')
    } finally {
      setLoading(false)
    }
  }, [alertId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const t = detail && isIncidentType(detail.type) ? INCIDENT_TYPES[detail.type] : INCIDENT_TYPES.OTHER
  const l = detail && isAlertLevel(detail.level) ? ALERT_LEVELS[detail.level] : ALERT_LEVELS.LEVEL_2
  const acked = recipients.filter((r) => r.ackAt)
  const pending = recipients.filter((r) => !r.ackAt)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] max-w-md mx-auto rounded-t-3xl p-0 flex flex-col" dir="rtl">
        {loading || !detail ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">در حال بارگذاری...</div>
        ) : (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b space-y-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base font-black text-right">{detail.title}</SheetTitle>
                  <SheetDescription className="text-xs text-right flex items-center gap-1.5">
                    <span className="font-bold text-white rounded-full px-2 py-0.5 text-[10px]" style={{ background: l.color }}>
                      {l.short}
                    </span>
                    <span className="font-mono" dir="ltr">{detail.code}</span>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {detail.status === 'ACTIVE' ? 'در جریان' : 'پایان‌یافته'}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 ihms-scroll">
              <div className="px-4 py-4 space-y-4">
                {/* مشخصات */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2.5 text-sm">
                  <p className="flex items-center gap-2 text-slate-700">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {detail.project?.name}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {detail.location}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {faDateTime(detail.createdAt)}
                    {detail.endedAt && (
                      <span className="text-slate-400">تا {faTime(detail.endedAt)}</span>
                    )}
                  </p>
                  {detail.description && (
                    <p className="text-slate-600 leading-6 border-t border-slate-200 pt-2.5 mt-1">{detail.description}</p>
                  )}
                  {detail.instructions && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        دستورالعمل اضطراری
                      </p>
                      <p className="text-[13px] text-amber-900 leading-6 whitespace-pre-line">{detail.instructions}</p>
                    </div>
                  )}
                </div>

                {/* لیست تأیید */}
                <div>
                  <p className="text-xs font-black text-slate-600 mb-2">
                    وضعیت گیرندگان ({faNum(acked.length)}/{faNum(recipients.length)} تأیید)
                  </p>
                  <div className="space-y-1.5">
                    {acked.map((r) => (
                      <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 px-3 py-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{r.fullName}</p>
                          <p className="text-[10px] text-slate-400">{r.groups[0] || r.jobTitle || 'پرسنل'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 shrink-0">{faTime(r.ackAt!)}</span>
                      </div>
                    ))}
                    {pending.map((r) => (
                      <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        {r.mutedAt ? <VolumeX className="w-4 h-4 text-amber-500 shrink-0" /> : <Clock className="w-4 h-4 text-slate-300 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-600 truncate">{r.fullName}</p>
                          <p className="text-[10px] text-slate-400">{r.groups[0] || r.jobTitle || 'پرسنل'}</p>
                        </div>
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="text-emerald-600 p-1" aria-label={`تماس ${r.fullName}`}>
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                    {recipients.length === 0 && <p className="text-xs text-slate-400 py-2">اطلاعاتی ثبت نشده</p>}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {detail.canEnd && detail.status === 'ACTIVE' && (
              <div className="px-4 py-3 border-t bg-slate-50 flex gap-2">
                <Button
                  onClick={() => onMonitor?.(detail.id)}
                  className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2"
                >
                  <Siren className="w-4.5 h-4.5" />
                  پایش زنده
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
