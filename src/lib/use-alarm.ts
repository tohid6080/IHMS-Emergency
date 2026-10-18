'use client'

// ─────────────────────────────────────────────
// آژیر صوتی (Web Audio) + لرزش گوشی
// ─────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'

export function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{ osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null>(null)
  const vibrateTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [playing, setPlaying] = useState(false)
  const [needsGesture, setNeedsGesture] = useState(false)

  const stop = useCallback(() => {
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
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
    setPlaying(false)
  }, [])

  const start = useCallback(() => {
    if (playing) return
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = ctxRef.current ?? new AC()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => setNeedsGesture(false))
          .catch(() => setNeedsGesture(true))
      }

      const master = ctx.createGain()
      master.gain.value = 0.22
      master.connect(ctx.destination)

      // آژیر وايل: فرکانس پایه با LFO بین ۴۵۰ تا ۹۰۰ هرتز
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 650

      const oscGain = ctx.createGain()
      oscGain.gain.value = 250 // دامنه تغییر فرکانس

      const lfo = ctx.createOscillator()
      lfo.type = 'triangle'
      lfo.frequency.value = 0.45 // سرعت چرخش آژیر

      lfo.connect(oscGain)
      oscGain.connect(osc.frequency)
      osc.connect(master)

      osc.start()
      lfo.start()
      nodesRef.current = { osc, lfo, gain: master }
      setPlaying(true)
      setNeedsGesture(false)

      // لرزش الگودار
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const pattern = [600, 300, 600, 300, 1200, 700]
        navigator.vibrate(pattern)
        vibrateTimer.current = setInterval(() => navigator.vibrate(pattern), 3800)
      }
    } catch (e) {
      console.error('alarm error', e)
    }
  }, [playing])

  // پاکسازی هنگام unmount
  useEffect(() => () => stop(), [stop])

  return { start, stop, playing, needsGesture }
}
