// ─────────────────────────────────────────────
// IHMS Emergency — Shared constants & labels (Persian)
// ─────────────────────────────────────────────

export const INCIDENT_TYPES = {
  FIRE: { label: 'حریق', icon: '🔥', color: '#dc2626' },
  MEDICAL: { label: 'حادثه پزشکی / مصدومیت', icon: '🚑', color: '#e11d48' },
  CHEMICAL: { label: 'نشت مواد شیمیایی', icon: '☣️', color: '#7c3aed' },
  GAS: { label: 'نشت گاز', icon: '💨', color: '#ea580c' },
  EVACUATION: { label: 'تخلیه اضطراری', icon: '🚨', color: '#b91c1c' },
  SECURITY: { label: 'تهدید امنیتی', icon: '🛡️', color: '#334155' },
  RESCUE: { label: 'گیرافتادگی / نیاز به نجات', icon: '⛑️', color: '#d97706' },
  STRUCTURAL: { label: 'فروریختگی / خرابی سازه', icon: '🏗️', color: '#a16207' },
  OTHER: { label: 'سایر حوادث', icon: '⚠️', color: '#64748b' },
} as const

export type IncidentType = keyof typeof INCIDENT_TYPES

export const ALERT_LEVELS = {
  LEVEL_1: { label: 'سطح ۱ — قابل کنترل', short: 'سطح ۱', desc: 'حادثه محلی، توسط تیم همان واحد قابل کنترل است', color: '#f59e0b' },
  LEVEL_2: { label: 'سطح ۲ — جدی', short: 'سطح ۲', desc: 'جدی؛ نیازمند چند تیم واکنش اضطراری', color: '#f97316' },
  LEVEL_3: { label: 'سطح ۳ — بحرانی', short: 'سطح ۳', desc: 'بحرانی؛ تخلیه کلی و mobilization تمام منابع', color: '#dc2626' },
} as const

export type AlertLevel = keyof typeof ALERT_LEVELS

export const GROUP_KINDS = {
  ALL: { label: 'کلیه پرسنل', icon: '👥', color: '#2563eb', system: true },
  FIRE: { label: 'آتش‌نشانی و اطفای حریق', icon: '🚒', color: '#dc2626', system: true },
  MEDICAL: { label: 'بهداری و امداد پزشکی', icon: '🚑', color: '#e11d48', system: true },
  RESCUE: { label: 'امداد و نجات', icon: '⛑️', color: '#d97706', system: true },
  HSE: { label: 'مسئولان و سرپرستان HSE', icon: '🦺', color: '#16a34a', system: true },
  PM: { label: 'مدیریت پروژه و مدیریت ارشد', icon: '🏢', color: '#7c3aed', system: true },
  SECURITY: { label: 'حراست و کنترل تردد', icon: '🛡️', color: '#475569', system: true },
  OPS: { label: 'بهره‌برداری و امور فنی', icon: '⚙️', color: '#0891b2', system: true },
  ENV: { label: 'محیط‌زیست و واکنش به نشت مواد', icon: '🌿', color: '#65a30d', system: true },
  CUSTOM: { label: 'گروه سفارشی سازمان', icon: '📌', color: '#db2777', system: false },
} as const

export type GroupKind = keyof typeof GROUP_KINDS

// ─── اطلاع‌رسانی هوشمند: نوع حادثه ← گروه‌های هدف پیش‌فرض ───
export const SMART_DISPATCH: Record<IncidentType, GroupKind[]> = {
  FIRE: ['ALL', 'FIRE', 'MEDICAL', 'HSE', 'SECURITY', 'PM', 'OPS'],
  MEDICAL: ['ALL', 'MEDICAL', 'HSE', 'PM', 'RESCUE'],
  CHEMICAL: ['ALL', 'ENV', 'OPS', 'HSE', 'SECURITY', 'MEDICAL', 'PM'],
  GAS: ['ALL', 'FIRE', 'OPS', 'ENV', 'HSE', 'SECURITY'],
  EVACUATION: ['ALL', 'FIRE', 'MEDICAL', 'RESCUE', 'HSE', 'PM', 'SECURITY', 'OPS', 'ENV'],
  SECURITY: ['SECURITY', 'PM', 'HSE', 'OPS'],
  RESCUE: ['RESCUE', 'MEDICAL', 'FIRE', 'HSE', 'PM'],
  STRUCTURAL: ['RESCUE', 'FIRE', 'MEDICAL', 'HSE', 'PM', 'SECURITY'],
  OTHER: ['HSE', 'PM', 'SECURITY'],
}

export const DEFAULT_INSTRUCTIONS: Partial<Record<IncidentType, string>> = {
  FIRE: '۱) خونسردی خود را حفظ کنید. ۲) در صورت مشاهده دود یا آتش، شماره اضطراری داخلی را خبر کنید. ۳) به نزدیک‌ترین خروج اضطراری حرکت کنید. ۴) از آسانسور استفاده نکنید. ۵) در نقطه تجمع اعلام‌شده حضور پیدا کنید.',
  CHEMICAL: '۱) بلافاصله منطقه آلوده را ترک کنید. ۲) در جهت مخالف جریان باد حرکت کنید. ۳) از تنفس مستقیم بخارات خودداری کنید. ۴) در صورت تماس پوستی، ناحیه را با آب فراوان بشویید. ۵) منتظر دستور تیم مقابله با نشت باشید.',
  GAS: '۱) هرگونه شعله یا جرقه را خاموش کنید. ۲) کلیدهای برقی را نزنید. ۳) شیر قطع گاز را ببندید (در صورت آموزش دیدن). ۴) منطقه را ترک و به تیم بهره‌برداری خبر دهید.',
  EVACUATION: '۱) بلافاصله کار را متوقف کنید. ۲) تجهیزات برقی را در صورت امکان خاموش کنید. ۳) طبق نقشه تخلیه به خروج اضطراری نزدیک حرکت کنید. ۴) به نقطه تجمع (Assembly Point) بروید. ۵) منتظر شمارش نیروها بمانید و محل را ترک نکنید.',
  SECURITY: '۱) آرام و بی‌صدا منطقه را ترک کنید. ۲) به دستورات حراست توجه کنید. ۳) عکس و فیلم تهیه نکنید. ۴) در محل امن منتظر بمانید.',
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدیر سیستم',
  DISPATCHER: 'اعلام‌کننده اضطراری',
  USER: 'پرسنل',
}

export const ACCESS_LEVEL_LABELS: Record<string, string> = {
  ADMIN: 'کامل',
  MANAGER: 'مدیریتی',
  USER: 'عادی',
}

export const CATEGORY_LABELS: Record<string, string> = {
  FIRE: 'آتش‌نشانی',
  MEDICAL: 'بهداری و درمان',
  RESCUE: 'امداد و نجات',
  HSE: 'HSE',
  PM: 'مدیریت',
  SECURITY: 'حراست',
  OPS: 'بهره‌برداری',
  ENV: 'محیط‌زیست',
  UTILITY: 'تأسیسات و شماره‌های اضطراری',
  OTHER: 'سایر',
}

export function isIncidentType(v: string): v is IncidentType {
  return v in INCIDENT_TYPES
}
export function isAlertLevel(v: string): v is AlertLevel {
  return v in ALERT_LEVELS
}
