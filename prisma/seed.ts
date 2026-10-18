// ─────────────────────────────────────────────
// IHMS Emergency — Seed Data
// سازمان نمونه: زرین برگ پارس (مطابق ویدیوی مرجع)
// ─────────────────────────────────────────────
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function sha(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

async function main() {
  console.log('🌱 Seeding IHMS Emergency...')

  // پاکسازی
  await db.acknowledgment.deleteMany()
  await db.alertDelivery.deleteMany()
  await db.alert.deleteMany()
  await db.activationCode.deleteMany()
  await db.groupMember.deleteMany()
  await db.userProject.deleteMany()
  await db.contact.deleteMany()
  await db.group.deleteMany()
  await db.user.deleteMany()
  await db.project.deleteMany()
  await db.organization.deleteMany()

  const year2 = new Date()
  year2.setFullYear(year2.getFullYear() + 1)

  const org = await db.organization.create({
    data: {
      name: 'زرین برگ پارس',
      code: 'ZBP-1404',
      plan: 'ENTERPRISE',
      maxUsers: 500,
      subscriptionEndsAt: year2,
    },
  })
  console.log('✓ سازمان:', org.name)

  // ─── پروژه‌ها ───
  const p1 = await db.project.create({
    data: { organizationId: org.id, name: 'سالن تولید ۱', location: 'شهرک صنعتی پردیس — سایت اصلی', description: 'خط تولید بسته‌بندی غذایی' },
  })
  const p2 = await db.project.create({
    data: { organizationId: org.id, name: 'انبار مرکزی و مواد شیمیایی', location: 'شرق سایت — انبار ۳', description: 'نگهداری مواد اولیه و شیمیایی' },
  })
  const p3 = await db.project.create({
    data: { organizationId: org.id, name: 'پروژه احداث پالایشگاه', location: 'محوطه شمالی', description: 'پروژه عمرانی در حال اجرا' },
  })
  console.log('✓ پروژه‌ها:', 3)

  // ─── کاربران ───
  const mkUser = (data: {
    username: string
    fullName: string
    jobTitle: string
    phone: string
    role: string
    accessLevel: string
    canActivate: boolean
    personnelCode?: string
  }) =>
    db.user.create({
      data: { ...data, organizationId: org.id, password: sha(data.username === 'admin' ? 'admin123' : '123456') },
    })

  const admin = await mkUser({ username: 'admin', fullName: 'مدیر سامانه', jobTitle: 'مدیر IT', phone: '09120000000', role: 'ADMIN', accessLevel: 'ADMIN', canActivate: true, personnelCode: 'ZBP-0001' })
  const davod = await mkUser({ username: 'dispatcher', fullName: 'داود جورکش', jobTitle: 'کارشناس ارشد HSE', phone: '09121112233', role: 'DISPATCHER', accessLevel: 'MANAGER', canActivate: true, personnelCode: 'ZBP-0100' })
  const fire1 = await mkUser({ username: 'fire1', fullName: 'رضا کریمی', jobTitle: 'سرپرست آتش‌نشانی', phone: '09122223344', role: 'USER', accessLevel: 'USER', canActivate: true, personnelCode: 'ZBP-0201' })
  const fire2 = await mkUser({ username: 'fire2', fullName: 'حسین موحدی', jobTitle: 'عضو تیم آتش‌نشانی', phone: '09123334455', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0202' })
  const med1 = await mkUser({ username: 'med1', fullName: 'مریم اسدی', jobTitle: 'پزشک سایت', phone: '09124445566', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0301' })
  const rescue1 = await mkUser({ username: 'rescue1', fullName: 'علی رستمی', jobTitle: 'سرپرست امداد و نجات', phone: '09125556677', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0401' })
  const pm1 = await mkUser({ username: 'pm1', fullName: 'سعید محمدی', jobTitle: 'مدیر پروژه', phone: '09126667788', role: 'USER', accessLevel: 'MANAGER', canActivate: true, personnelCode: 'ZBP-0501' })
  const sec1 = await mkUser({ username: 'security1', fullName: 'ناصر قاسمی', jobTitle: 'رئیس حراست', phone: '09127778899', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0601' })
  const env1 = await mkUser({ username: 'env1', fullName: 'زهرا نوری', jobTitle: 'کارشناس محیط‌زیست', phone: '09128889900', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0701' })
  const ops1 = await mkUser({ username: 'ops1', fullName: 'مهدی تهرانی', jobTitle: 'سرپرست بهره‌برداری', phone: '09129990011', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0801' })
  const worker1 = await mkUser({ username: 'worker1', fullName: 'امیر رضایی', jobTitle: 'اپراتور خط تولید', phone: '09121110022', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0901' })
  const worker2 = await mkUser({ username: 'worker2', fullName: 'سمیرا کاظمی', jobTitle: 'اپراتور بسته‌بندی', phone: '09121220033', role: 'USER', accessLevel: 'USER', canActivate: false, personnelCode: 'ZBP-0902' })
  console.log('✓ کاربران:', 12)

  // ─── گروه‌ها ───
  const mkGroup = (name: string, kind: string, color: string, description: string, memberIds: string[] = []) =>
    db.group.create({ data: { organizationId: org.id, name, kind, color, description, isSystem: kind !== 'CUSTOM', members: { create: memberIds.map((userId) => ({ userId })) } } })

  const gAll = await mkGroup('کلیه پرسنل', 'ALL', '#2563eb', 'کلیه پرسنل فعال و تعریف‌شده در پروژه‌ها')
  const gFire = await mkGroup('تیم آتش‌نشانی و اطفای حریق', 'FIRE', '#dc2626', 'تیم واکنش سریع حریق', [fire1.id, fire2.id])
  const gMed = await mkGroup('بهداری و امداد پزشکی', 'MEDICAL', '#e11d48', 'پزشک، پرستار و امدادگر', [med1.id])
  const gRescue = await mkGroup('امداد و نجات', 'RESCUE', '#d97706', 'تیم نجات در ارتفاع و گیرافتادگی', [rescue1.id])
  const gHse = await mkGroup('مسئولان و سرپرستان HSE', 'HSE', '#16a34a', 'کارشناسان HSE', [davod.id])
  const gPm = await mkGroup('مدیریت پروژه و مدیریت ارشد', 'PM', '#7c3aed', 'مدیران پروژه و مدیران ارشد', [pm1.id])
  const gSec = await mkGroup('حراست و کنترل تردد', 'SECURITY', '#475569', 'حراست سایت', [sec1.id])
  const gOps = await mkGroup('بهره‌برداری و امور فنی', 'OPS', '#0891b2', 'تیم بهره‌برداری و فنی', [ops1.id])
  const gEnv = await mkGroup('محیط‌زیست و واکنش به نشت مواد', 'ENV', '#65a30d', 'واکنش به نشت و آلودگی', [env1.id])
  await mkGroup('تیم ارزیابی بحران نوبت شب', 'CUSTOM', '#db2777', 'گروه سفارشی سازمان', [fire1.id, ops1.id])
  console.log('✓ گروه‌ها:', 10)

  // ─── تخصیص پروژه ───
  const allUsers = [admin, davod, fire1, fire2, med1, rescue1, pm1, sec1, env1, ops1, worker1, worker2]
  await db.userProject.createMany({
    data: [
      ...allUsers.map((u) => ({ userId: u.id, projectId: p1.id, role: 'عضو پروژه' })),
      ...[davod, fire1, fire2, sec1, env1, ops1, worker1].map((u) => ({ userId: u.id, projectId: p2.id, role: 'عضو پروژه' })),
      ...[davod, pm1, sec1, rescue1].map((u) => ({ userId: u.id, projectId: p3.id, role: 'عضو پروژه' })),
    ],
  })
  console.log('✓ تخصیص پروژه‌ها')

  // ─── کدهای فعال‌سازی ───
  const mkCode = (code: string, userId: string | null, label: string, canActivate: boolean, role = 'USER') =>
    db.activationCode.create({ data: { organizationId: org.id, code, userId, label, canActivate, role } })

  await mkCode('HSE-CODE-01', davod.id, 'کد کارشناس HSE', true, 'DISPATCHER')
  await mkCode('FIRE-TEAM-01', fire1.id, 'کد سرپرست آتش‌نشانی', true)
  await mkCode('FIRE-TEAM-02', fire2.id, 'کد عضو آتش‌نشانی', false)
  await mkCode('MED-TEAM-01', med1.id, 'کد پزشک سایت', false)
  await mkCode('WORKER-01', worker1.id, 'کد پرسنل تولید', false)
  await mkCode('WORKER-02', worker2.id, 'کد پرسنل تولید', false)
  await mkCode('PM-CODE-01', pm1.id, 'کد مدیر پروژه', true)
  await mkCode('ADMIN-CODE-01', admin.id, 'کد مدیر سیستم', true, 'ADMIN')
  console.log('✓ کدهای فعال‌سازی:', 8)

  // ─── مخاطبین اضطراری ───
  await db.contact.createMany({
    data: [
      { organizationId: org.id, name: 'آتش‌نشانی — کلانتیه منطقه', title: 'شماره اضطراری شهرکی', phone: '125', category: 'UTILITY', isEmergency: true, priority: 1 },
      { organizationId: org.id, name: 'اورژانس پیش‌بیمارستانی', title: 'آمبولانس اضطراری', phone: '115', category: 'UTILITY', isEmergency: true, priority: 2 },
      { organizationId: org.id, name: 'اورژانس محیط‌زیست', title: 'گزارش آلودگی و نشت', phone: '1544', category: 'UTILITY', isEmergency: true, priority: 3 },
      { organizationId: org.id, name: 'داود جورکش', title: 'مدیر HSE سازمان', phone: '09121112233', email: 'd.jorkesh@zbpars.ir', category: 'HSE', isEmergency: true, priority: 10 },
      { organizationId: org.id, name: 'رضا کریمی', title: 'سرپرست آتش‌نشانی', phone: '09122223344', category: 'FIRE', isEmergency: true, priority: 11 },
      { organizationId: org.id, name: 'مریم اسدی', title: 'پزشک و مسئول بهداری', phone: '09124445566', email: 'm.asadi@zbpars.ir', category: 'MEDICAL', isEmergency: true, priority: 12 },
      { organizationId: org.id, name: 'علی رستمی', title: 'سرپرست امداد و نجات', phone: '09125556677', category: 'RESCUE', isEmergency: true, priority: 13 },
      { organizationId: org.id, name: 'ناصر قاسمی', title: 'رئیس حراست سایت', phone: '09127778899', category: 'SECURITY', isEmergency: true, priority: 14 },
      { organizationId: org.id, name: 'سعید محمدی', title: 'مدیر پروژه', phone: '09126667788', email: 's.mohammadi@zbpars.ir', category: 'PM', priority: 20 },
      { organizationId: org.id, name: 'زهرا نوری', title: 'کارشناس محیط‌زیست', phone: '09128889900', category: 'ENV', priority: 21 },
      { organizationId: org.id, name: 'مهدی تهرانی', title: 'سرپرست بهره‌برداری و امور فنی', phone: '09129990011', category: 'OPS', priority: 22 },
      { organizationId: org.id, name: 'گردان شب حراست', title: 'کنترل ورودی و گیت', phone: '02112345678', category: 'SECURITY', priority: 30 },
    ],
  })
  console.log('✓ مخاطبین اضطراری:', 12)

  console.log('\n🎉 Seed complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('حساب‌های نمونه:')
  console.log('  admin / admin123        (مدیر سیستم — دسترسی کامل + پنل مدیریت)')
  console.log('  dispatcher / 123456     (داود جورکش — فعال‌سازی اضطراری)')
  console.log('  fire1 / 123456          (سرپرست آتش‌نشانی)')
  console.log('  worker1 / 123456        (پرسنل عادی — گیرنده هشدار)')
  console.log('کدهای فعال‌سازی: HSE-CODE-01 · FIRE-TEAM-01 · WORKER-01 · ADMIN-CODE-01')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
