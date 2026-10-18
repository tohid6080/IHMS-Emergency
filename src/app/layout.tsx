import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SonnerToaster } from "@/components/ihms/sonner-toaster";

export const metadata: Metadata = {
  title: "IHMS Emergency — سامانه اطلاع‌رسانی شرایط اضطراری",
  description:
    "اپلیکیشن هوشمند اطلاع‌رسانی شرایط اضطراری HSE: دریافت هشدار لحظه‌ای حوادث، آژیر و صفحه تمام‌قرمز، تأیید دریافت، مخاطبین اضطراری و تاریخچه حوادث پروژه‌ها",
  keywords: ["IHMS", "HSE", "اضطراری", "هشدار", "امنیت", "حریق", "تخلیه", "emergency"],
  applicationName: "IHMS Emergency",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IHMS Emergency",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#b91c1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground font-vazir">
        {children}
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
