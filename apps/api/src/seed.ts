import type { Store } from './db.ts';
import { CONSENT_VERSION } from '../../../packages/core/domain.ts';
export async function seed(db: Store) {
  if ((await db.list('users')).length) return;
  const ago = (days: number, hour = 8) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, 15, 0, 0);
    return d.toISOString();
  };
  for (const [role, name, email] of [
    ['member', 'Nomsa Dlamini', 'nomsa@example.test'],
    ['doctor', 'Dr Priya Naicker', 'doctor@example.test'],
    ['nurse', 'Sister Thandi Mkhize', 'nurse@example.test'],
    ['admin', 'Care coordinator', 'admin@example.test'],
    ['pharmacy', 'Coastline Pharmacy', 'pharmacy@example.test'],
    ['driver', 'Sipho Mthembu', 'driver@example.test'],
    ['family', 'Lindiwe Dlamini', 'family@example.test'],
  ])
    await db.insert(
      'users',
      { role, name, email, phone: '+27000000000', demo: true },
      null,
      `user-${role}`,
    );
  await db.insert(
    'members',
    {
      userId: 'user-member',
      name: 'Nomsa Dlamini',
      preferredName: 'Nomsa',
      dateOfBirth: '1959-04-12',
      phone: '+27000000000',
      email: 'nomsa@example.test',
      tier: 'monitor',
      status: 'active',
      address: '12 Example Lane, Morningside, Durban',
      geo: { lat: -29.826, lng: 31.016 },
      medicalAidScheme: 'Example Medical Aid',
      medicalAidNumber: 'DEMO-0001',
      nextOfKin: { name: 'Lindiwe Dlamini', phone: '+27000000000' },
      doctor: { name: 'Dr Priya Naicker', phone: '+27000000000' },
      coordinator: 'Sister Thandi Mkhize',
      conditions: ['Hypertension'],
      allergies: ['Penicillin'],
      demo: true,
    },
    null,
    'member-demo',
  );
  for (const type of ['care', 'communications', 'delivery'])
    await db.insert(
      'consents',
      { type, version: CONSENT_VERSION, grantedAt: ago(45), revokedAt: null },
      'member-demo',
    );
  await db.insert(
    'family_viewers',
    {
      userId: 'user-family',
      name: 'Lindiwe Dlamini',
      email: 'family@example.test',
      scope: 'summary_updates',
      consultNotes: false,
      emergency: true,
      grantedAt: ago(30),
      revokedAt: null,
    },
    'member-demo',
  );
  await db.insert(
    'subscriptions',
    {
      tier: 'monitor',
      amount: 170000,
      billingDay: 1,
      paymentMethod: 'card',
      status: 'active',
      startedAt: ago(45),
      nextBillingAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      test: true,
    },
    'member-demo',
    'subscription-demo',
  );
  await db.insert(
    'invoices',
    {
      type: 'retainer',
      reference: 'PW-DEMO-001',
      amount: 170000,
      status: 'paid',
      dueAt: ago(13),
      paidAt: ago(13),
      description: 'Monitor membership • example invoice',
      test: true,
    },
    'member-demo',
  );
  for (let i = 13; i >= 0; i--) {
    await db.insert(
      'vitals',
      {
        type: 'blood_pressure',
        value: 120 + (i % 4) * 3,
        secondary: 77 + (i % 5),
        unit: 'mmHg',
        takenAt: ago(i),
        source: 'manual',
        flagged: i === 4,
        reviewedAt: i === 4 ? ago(3) : null,
      },
      'member-demo',
    );
    if (i % 2 === 0)
      await db.insert(
        'vitals',
        {
          type: 'glucose',
          value: 5.3 + (i % 3) * 0.2,
          unit: 'mmol/L',
          takenAt: ago(i),
          source: 'manual',
          flagged: false,
        },
        'member-demo',
      );
  }
  await db.insert(
    'vitals',
    {
      type: 'heart_rate',
      value: 72,
      unit: 'bpm',
      takenAt: ago(0),
      source: 'manual',
      flagged: false,
    },
    'member-demo',
  );
  await db.insert(
    'thresholds',
    {
      type: 'blood_pressure',
      low: 90,
      high: 140,
      secondaryHigh: 90,
      setBy: 'user-doctor',
      demoProtocol: true,
    },
    'member-demo',
  );
  await db.insert(
    'thresholds',
    { type: 'glucose', low: 4, high: 7.8, setBy: 'user-doctor', demoProtocol: true },
    'member-demo',
  );
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 30, 0, 0);
  await db.insert(
    'consults',
    {
      reason: 'Monthly wellness check-in',
      mode: 'virtual',
      urgency: 'routine',
      status: 'scheduled',
      scheduledAt: next.toISOString(),
      doctorId: 'user-doctor',
      doctorName: 'Dr Priya Naicker',
      note: '',
      signedAt: null,
    },
    'member-demo',
    'consult-demo',
  );
  await db.insert(
    'consults',
    {
      reason: 'Routine blood pressure review',
      mode: 'virtual',
      status: 'completed',
      scheduledAt: ago(7, 10),
      doctorId: 'user-doctor',
      doctorName: 'Dr Priya Naicker',
      note: 'Fictional demonstration note. Readings reviewed and follow-up arranged.',
      signedAt: ago(7, 11),
    },
    'member-demo',
  );
  await db.insert(
    'medication_events',
    {
      drug: 'Amlodipine',
      strength: '5 mg',
      directions: 'As prescribed on your dispensing label',
      quantity: 30,
      prescriber: 'Dr Priya Naicker',
      pharmacy: 'Coastline Pharmacy (demo)',
      dispensedAt: ago(21),
      status: 'current',
      source: 'Demo record',
    },
    'member-demo',
  );
  await db.insert(
    'documents',
    {
      type: 'pathology',
      name: 'Routine blood results.pdf',
      documentDate: ago(7).slice(0, 10),
      tags: ['Routine check'],
      status: 'verified',
      verifiedBy: 'user-nurse',
      verifiedAt: ago(6),
      extractedText: 'Fictional example document. No clinical result is contained in this demo.',
      hasFile: false,
    },
    'member-demo',
  );
  await db.insert(
    'orders',
    {
      status: 'ready',
      pharmacy: 'Coastline Pharmacy (demo)',
      scriptId: null,
      description: 'Monthly prescription',
      items: [
        {
          drug: 'Amlodipine',
          strength: '5 mg',
          quantity: 30,
          directions: 'As prescribed on dispensing label',
          scheduleClass: 0,
          coldChain: false,
        },
      ],
      events: [
        { status: 'sent', at: ago(1) },
        { status: 'dispensing', at: ago(0, 9) },
        { status: 'ready', at: ago(0, 10) },
      ],
      driverId: 'user-driver',
      eta: 'Awaiting collection',
      address: '12 Example Lane, Morningside, Durban',
    },
    'member-demo',
    'order-demo',
  );
  await db.insert(
    'reminders',
    {
      type: 'reading',
      title: 'Your morning blood pressure',
      time: '08:00',
      enabled: true,
      acknowledgedAt: null,
    },
    'member-demo',
  );
  await db.insert(
    'reminders',
    {
      type: 'medication',
      title: 'Check your prescribed medication',
      time: '08:30',
      enabled: true,
      acknowledgedAt: null,
    },
    'member-demo',
  );
  await db.insert(
    'benefits',
    {
      category: 'Dental',
      annualLimit: 200000,
      used: 0,
      nextScheduledAt: null,
      source: 'Example benefit — verify with scheme',
    },
    'member-demo',
  );
  await db.insert(
    'villages',
    {
      name: 'Oceanview Village (demo)',
      operator: 'Example operator',
      address: 'Durban North',
      residentCount: 0,
      clinicDay: 'Thursday',
      contractAmount: 0,
    },
    null,
    'village-demo',
  );
  await db.insert('clinic_sessions', {
    villageId: 'village-demo',
    date: next.toISOString(),
    doctorId: 'user-doctor',
    nurseId: 'user-nurse',
    attendees: [],
  });
  await db.insert(
    'audit_log',
    {
      actorId: 'system',
      action: 'seed_demo',
      entity: 'members',
      entityId: 'member-demo',
      at: new Date().toISOString(),
      ip: 'local',
    },
    'member-demo',
  );
}
