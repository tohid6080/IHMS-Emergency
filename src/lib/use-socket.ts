'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface AlertNewPayload {
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
    reportedByName: string
    reportedByTitle?: string | null
  }
  targets: string[]
  targetCount: number
}

export interface AlertAckPayload {
  alertId: string
  user: { id: string; fullName: string; jobTitle: string | null; role: string }
  ackAt: string
}

export interface AlertEndPayload {
  alertId: string
  endedByName: string
}

export interface SocketHandlers {
  onAlertNew?: (p: AlertNewPayload) => void
  onAck?: (p: AlertAckPayload) => void
  onMute?: (p: { alertId: string; user: { id: string; fullName: string } }) => void
  onEnd?: (p: AlertEndPayload) => void
}

export function useSocket(handlers: SocketHandlers) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    // اتصال از طریق گیت‌وی Caddy
    const socket = io('/?XTransformPort=3003', {
      path: '/',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      const token = localStorage.getItem('ihms_socket_token')
      if (token) socket.emit('auth', { token })
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('auth:result', (r: { ok: boolean }) => {
      if (!r.ok) {
        // توکن نامعتبر — دوباره بگیر
        fetch('/api/auth/me')
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.socketToken) {
              localStorage.setItem('ihms_socket_token', d.socketToken)
              socket.emit('auth', { token: d.socketToken })
            }
          })
          .catch(() => {})
      }
    })

    socket.on('alert:new', (p: AlertNewPayload) => handlersRef.current.onAlertNew?.(p))
    socket.on('alert:ack', (p: AlertAckPayload) => handlersRef.current.onAck?.(p))
    socket.on('alert:mute', (p: { alertId: string; user: { id: string; fullName: string } }) =>
      handlersRef.current.onMute?.(p),
    )
    socket.on('alert:end', (p: AlertEndPayload) => handlersRef.current.onEnd?.(p))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const reAuth = useCallback(() => {
    socketRef.current?.emit('auth', { token: localStorage.getItem('ihms_socket_token') })
  }, [])

  return { connected, reAuth }
}
