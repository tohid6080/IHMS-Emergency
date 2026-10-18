'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { INCIDENT_TYPES, ALERT_LEVELS, DEFAULT_INSTRUCTIONS, isIncidentType, isAlertLevel } from '@/lib/constants'
import { faDateTime, faTime, faNum } from '@/lib/client-api'
import { api } from '@/lib/client-api'
import { Siren, MapPin, Building2, Clock, ClipboardList, UserRound, CheckCircle2, VolumeX, Volume2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AlertNewPayload } from '@/lib/use-socket'

type FullAlert = AlertNewPayload['alert'] & { reportedBy?: { fullName: string } | null }

interface Props {
  alert: FullAlert
  /** قبلاً تأیید کرده‌ام */
  initialAcked?: boolean
  onAcked: () => void
  onClose: () => void
}

export function FullScreenAlert({ alert, initialAcked = false, onAcked, onClose }: Props) {
  const [ackedAt, setAckedAt] = useState<string | null>(initialAcked ? new Date().toISOString() : null)
  const [muted, setMuted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showAlarmPrompt, setShowAlarmPrompt] = useState(false)
  const alarmStarted = useRef(false)

  const typeInfo = isIncidentType(alert.type) ? INCIDENT_TYPES[alert.type] : INCIDENT_TYPES.OTHER
  const levelInfo = isAlertLevel(alert.level) ? ALERT_LEVELS[alert.level] : ALERT_LEVELS.LEVEL_2
  const instructions =
    alert.instructions?.trim() || DEFAULT_INSTRUCTIONS[alert.type as keyof typeof DEFAULT_INSTRUCTIONS] || 'دستورالعمل خاصی ثبت نشده است. دستورات سرپرست HSE را دنبال کنید.'

  // ─── آژیر + لرزش ───
  const audioCtxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{ osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null>(null)
  const vibrateTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAlarmSound = () => {
    if (vibrateTimer.current) {
      clearInterval(vibrateTimer.current)
      vibrateTimer.current = null
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(0)
    try {
      nodesRef.current?.lfo.stop()
      nodesRef.current?.osc.stop()
      nodesRef.current?.gain.disconnect()
    } catch {}
    nodesRef.current = null
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }

  const startAlarmSound = () => {
    if (nodesRef.current || ackedAt) return
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AC()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => setShowAlarmPrompt(true))
      }
      const master = ctx.createGain()
      master.gain.value = 0.25
      master.connect(ctx.destination)

      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 650
      const oscGain = ctx.createGain()
      oscGain.gain.value = 250
      const lfo = ctx.createOscillator()
      lfo.type = 'triangle'
      lfo.frequency.value = 0.45
      lfo.connect(oscGain)
      oscGain.connect(osc.frequency)
      osc.connect(master)
      osc.start()
      lfo.start()
      nodesRef.current = { osc, lfo, gain: master }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const pattern = [600, 300, 600, 300, 1200, 700]
        navigator.vibrate(pattern)
        vibrateTimer.current = setInterval(() => navigator.vibrate(pattern), 3800)
      }
    } catch {
      setShowAlarmPrompt(true)
    }
  }

  // شروع آژیر هنگام باز شدن (اگر تأیید نکرده باشم)
  useEffect(() => {
    if (!ackedAt && !alarmStarted.current) {
      alarmStarted.current = true
      startAlarmSound()
    }
    return () => stopAlarmSound()
  }, [])

  // نوتیفیکیشن سیستم هنگام مخفی بودن تب
  useEffect(() => {
    if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 ${alert.title}`, {
          body: `${typeInfo.label} — ${alert.location} — ${alert.projectName}`,
          tag: alert.id,
          requireInteraction: true,
        })
      } catch {}
    }
  }, [])

  async function doAck() {
    setBusy(true)
    try {
      await api.post(`/api/alerts/${alert.id}/ack`)
      stopAlarmSound()
      setAckedAt(new Date().toISOString())
      onAcked()
      toast.success('دریافت هشدار شما ثبت شد')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ثبت تأیید')
    } finally {
      setBusy(false)
    }
  }

  async function doMute() {
    setBusy(true)
    try {
      await api.post(`/api/alerts/${alert.id}/mute`)
      stopAlarmSound()
      setMuted(true)
      toast.info('آژیر ساکت شد — لطفاً دریافت را تأیید کنید')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا')
    } finally {
      setBusy(false)
    }
  }

  function resumeAudio() {
    setShowAlarmPrompt(false)
    audioCtxRef.current?.resume().catch(() => {})
    if (!nodesRef.current && !ackedAt && !muted) {
      startAlarmSound()
    }
  }

  const timer = useMemo(() => faDateTime(alert.createdAt), [alert.createdAt])

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex flex-col ihms-red-blink text-white overflow-y-auto ihms-scroll"
      style={{ background: 'linear-gradient(180deg,#b91c1c,#991b1b 60%,#7f1d1d)' }}
    >
      {/* هدر */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2 text-white/80 text-xs">
          <span className="font-mono font-bold" dir="ltr">{alert.code}</span>
          <span>•</span>
          <span>هشدار اضطراری سازمان</span>
        </div>
        {ackedAt && (
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 active:bg-white/20" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 gap-4 max-w-md w-full mx-auto">
        {/* آیکون آژیر */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/20 ihms-ripple" />
          {!ackedAt ? (
            <div className="w-28 h-28 rounded-full bg-white/15 backdrop-blur ihms-siren-pulse flex items-center justify-center border-4 border-white/30">
              <Siren className="w-14 h-14 text-white" strokeWidth={2} />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl">
              <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.2} />
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black leading-snug drop-shadow">
            {ackedAt ? 'دریافت شما ثبت شد' : 'شرایط اضطراری فعال شد'}
          </h1>
          <p className="mt-1 text-white/85 text-sm">
            {ackedAt ? 'به دستورات سرپرست HSE و تیم واکنش اضطراری عمل کنید' : 'لطفاً پس از مطالعه، دریافت هشدار را تأیید کنید'}
          </p>
        </div>

        {/* عنوان حادثه */}
        <div className="w-full rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2.5 border-b border-slate-100">
            <span className="text-2xl" aria-hidden>
              {typeInfo.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-base truncate">{alert.title}</p>
              <p className="text-xs text-slate-500">{typeInfo.label}</p>
            </div>
            <span
              className="shrink-0 text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
              style={{ backgroundColor: levelInfo.color }}
            >
              {levelInfo.short}
            </span>
          </div>

          <div className="px-4 py-3 space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 text-xs block">پروژه</span>
                <span className="font-semibold">{alert.projectName}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 text-xs block">محل وقوع</span>
                <span className="font-semibold">{alert.location}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 text-xs block">زمان اعلام</span>
                <span className="font-semibold">{timer}</span>
              </div>
            </div>
            {(alert.reportedBy || alert.reportedByName) && (
              <div className="flex items-start gap-2">
                <UserRound className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 text-xs block">گزارش‌دهنده</span>
                  <span className="font-semibold">{alert.reportedByName || alert.reportedBy?.fullName}</span>
                  {alert.reportedByTitle ? <span className="text-slate-400 text-xs"> — {alert.reportedByTitle}</span> : null}
                </div>
              </div>
            )}
            {alert.description && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-slate-700 leading-6 text-[13px]">
                {alert.description}
              </div>
            )}
          </div>

          {/* دستورالعمل */}
          <div className="mx-3 mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ClipboardList className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">دستورالعمل اضطراری</span>
            </div>
            <p className="text-[13px] text-amber-900 leading-6 whitespace-pre-line">{instructions}</p>
          </div>
        </div>

        {/* دکمه‌های عملیات */}
        {!ackedAt ? (
          <div className="w-full space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={doAck}
              disabled={busy}
              className="w-full h-14 rounded-2xl bg-white text-red-700 hover:bg-red-50 font-black text-lg shadow-xl active:scale-[0.98] transition-transform"
            >
              <CheckCircle2 className="w-6 h-6" />
              تأیید دریافت هشدار
            </Button>
            <Button
              variant="outline"
              onClick={doMute}
              disabled={busy}
              className="w-full h-12 rounded-2xl border-2 border-white/50 text-white hover:bg-white/10 hover:text-white font-bold bg-transparent"
            >
              {muted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              {muted ? 'آژیر ساکت شد' : 'ساکت کردن صدای آژیر'}
            </Button>
            <p className="text-center text-[11px] text-white/60 pt-1">
              تأیید شما به‌صورت لحظه‌ای به گزارش‌دهنده و سرپرست HSE ارسال می‌شود
            </p>
          </div>
        ) : (
          <div className="w-full space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="rounded-2xl bg-white/10 border border-white/20 p-3 text-center text-sm">
              <p>
                تأیید شده در ساعت <span className="font-bold">{faTime(ackedAt)}</span>
              </p>
              <p className="text-white/70 text-xs mt-1">این پنجره تا پایان شرایط اضطراری قابل دسترسی است</p>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-12 rounded-2xl border-2 border-white/50 text-white hover:bg-white/10 hover:text-white font-bold bg-transparent"
            >
              بازگشت به سامانه
            </Button>
          </div>
        )}
      </div>

      {/* درخواست لمس برای پخش صدا */}
      {showAlarmPrompt && !ackedAt && (
        <button
          onClick={resumeAudio}
          className="fixed inset-x-0 bottom-24 mx-auto w-fit bg-white text-red-700 font-black px-6 py-3 rounded-full shadow-2xl ihms-siren-pulse"
        >
          🔊 برای پخش صدای آژیر لمس کنید
        </button>
      )}
    </div>
  )
}
