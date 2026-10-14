// Prices and intended benefits describe the commercial proposition, not service availability.
export const PROTOTYPE_NOTICE =
  'Review prototype · Fictional data only. No clinical care, prescriptions, deliveries, claims or real payments are provided. Do not enter real patient or financial information.';
export const SUBSCRIPTION_NOTICE =
  'Intended subscription offering: benefits below are planned for launch, subject to operational readiness. Selecting a plan or recording a test payment only changes the demonstration; it does not purchase or activate care.';

export type Role = 'member' | 'family' | 'nurse' | 'doctor' | 'pharmacy' | 'driver' | 'admin';
export type Tier = 'connect' | 'monitor' | 'concierge';
export const TIERS = {
  connect: {
    name: 'Connect',
    amount: 99500,
    description: 'Your everyday connection to care',
    benefits: [
      'Planned: Unlimited virtual consults',
      'Planned: E-script to door',
      'Planned: Your lifelong Health Vault',
      'Planned: Medication & reading reminders',
      'Planned: A named care coordinator',
    ],
  },
  monitor: {
    name: 'Monitor',
    amount: 170000,
    description: 'A closer eye on your wellbeing',
    benefits: [
      'Planned: all Connect benefits',
      'Planned: BP cuff & glucometer on loan',
      'Planned: Daily nurse review of your vitals',
      'Planned: Monthly nurse check-in',
    ],
  },
  concierge: {
    name: 'Concierge',
    amount: 265000,
    description: 'Thoughtful care, taken further',
    benefits: [
      'Planned: all Monitor benefits',
      'Planned: Priority same-day delivery',
      'Planned: Updates for nominated family',
      'Planned: Mobile-clinic access',
      'Planned: Medical aid benefits management',
    ],
  },
} as const;
export const HOME_VISIT_FEE = 185000;
export const money = (cents: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function addBusinessDays(date: Date, days: number) {
  // Weekends plus SA public holidays. Update the calendar for future announced special holidays.
  const d = new Date(date);
  const holiday = (day: Date) => {
    const year = day.getUTCFullYear();
    const a = year % 19,
      b = Math.floor(year / 100),
      c = year % 100,
      d1 = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d1 - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easter = new Date(
      Date.UTC(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1),
    );
    const fixed = [
      '01-01',
      '03-21',
      '04-27',
      '05-01',
      '06-16',
      '08-09',
      '09-24',
      '12-16',
      '12-25',
      '12-26',
    ];
    const dates = fixed.map((s) => new Date(`${year}-${s}T00:00:00Z`));
    dates.push(new Date(+easter - 2 * 86400000), new Date(+easter + 86400000));
    const keys = dates.flatMap((x) =>
      x.getUTCDay() === 0
        ? [x.toISOString().slice(0, 10), new Date(+x + 86400000).toISOString().slice(0, 10)]
        : [x.toISOString().slice(0, 10)],
    );
    return keys.includes(day.toISOString().slice(0, 10));
  };
  while (days > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !holiday(d)) days--;
  }
  return d;
}
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const q =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}
export const DURBAN = { lat: -29.8587, lng: 31.0218 };
export const CONSENT_VERSION = '2026-10-v1';
export const CONSENT_TEXT = {
  care: 'I consent to Proactive Wellness collecting and using my health information to coordinate my care and keep my Health Vault.',
  communications:
    'I agree to receive care reminders and service updates. Notifications will not include health details.',
  delivery:
    'I consent to sharing the minimum prescription and delivery information with my pharmacy and delivery team when needed.',
};
export function canReadClinical(role: Role) {
  return ['member', 'nurse', 'doctor'].includes(role);
}
