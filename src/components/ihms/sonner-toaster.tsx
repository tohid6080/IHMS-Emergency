'use client'

import { Toaster } from 'sonner'

export function SonnerToaster() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      toastOptions={{
        style: { fontFamily: 'Vazirmatn, Tahoma, sans-serif', direction: 'rtl' },
      }}
    />
  )
}
