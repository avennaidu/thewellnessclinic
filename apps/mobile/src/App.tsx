import React, { useState, useEffect } from 'react';
import {
  Alert,
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  TIERS,
  PROTOTYPE_NOTICE,
  SUBSCRIPTION_NOTICE,
  money,
  type Tier,
} from '../../../packages/core/domain';
type Data = Record<string, any>;
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4173';
const pretty = (s: string) => s?.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());
const day = (s: string) =>
  s
    ? new Date(s).toLocaleString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'To be confirmed';

function Action({ children, onPress, secondary = false, disabled = false }: any) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[styles.buttonText, secondary && { color: '#087783' }]}>{children}</Text>
    </Pressable>
  );
}
function Input({ label, value, onChangeText, ...props }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="#667d8b"
        {...props}
      />
    </View>
  );
}
function Card({ children }: any) {
  return <View style={styles.card}>{children}</View>;
}
function Title({ children }: any) {
  return <Text style={styles.title}>{children}</Text>;
}
function Hint({ children }: any) {
  return <Text style={styles.hint}>{children}</Text>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null),
    [config, setConfig] = useState<Data | null>(null),
    [user, setUser] = useState<Data | null>(null),
    [data, setData] = useState<Data | null>(null),
    [boot, setBoot] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [tab, setTab] = useState('Home'),
    [screen, setScreen] = useState(''),
    [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [challenge, setChallenge] = useState<Data | null>(null),
    [form, setForm] = useState<Data>({}),
    [large, setLarge] = useState(false);
  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const call = async (path: string, method = 'GET', body?: any, session = token) => {
    const r = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Wellness-Client': 'app',
        ...(session ? { Authorization: `Bearer ${session}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const d = await r.json();
    if (!r.ok) {
      if (r.status === 401 && session) {
        await SecureStore.deleteItemAsync('pw.session');
        setToken(null);
        setUser(null);
        setData(null);
      }
      throw new Error(d.error || 'Unable to complete the request.');
    }
    return d;
  };
  const refresh = async (session = token) => {
    if (!session) return;
    const u = await call('/me', 'GET', undefined, session);
    setUser(u.user);
    setData(
      await call(
        u.user.role === 'driver' ? '/staff/overview' : '/portal',
        'GET',
        undefined,
        session,
      ),
    );
  };
  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async (path: string, body: any, message: string) => {
    await call(path, 'POST', body);
    await refresh();
    setScreen('');
    setForm({});
    Alert.alert('Saved', message);
  };
  useEffect(() => {
    (async () => {
      try {
        setConfig(await call('/config'));
        const stored = await SecureStore.getItemAsync('pw.session');
        if (stored) {
          setToken(stored);
          await refresh(stored);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setBoot(false);
      }
    })();
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && token) run(() => refresh());
    });
    return () => sub.remove();
  }, [token]);
  const authenticate = async (result: Data) => {
    await SecureStore.setItemAsync('pw.session', result.token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    setToken(result.token);
    setUser(result.user);
    setChallenge(null);
    setCode('');
    await refresh(result.token);
  };
  const open = (s: string, defaults: Data = {}) => {
    setScreen(s);
    setForm(defaults);
    setError('');
  };
  const mid = data?.member?.id;
  if (boot)
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color="#087783" />
          <Text style={styles.subtitle}>Getting your care space ready…</Text>
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>proactive</Text>
          <Text style={styles.wordmark}>WELLNESS</Text>
        </View>
        {user && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh records"
            onPress={() => run(() => refresh())}
          >
            <Text style={styles.refresh}>↻</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.demo}>
        <Text style={styles.demoText}>{PROTOTYPE_NOTICE}</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, large && { padding: 25 }]}
        refreshControl={
          user ? (
            <RefreshControl refreshing={busy} onRefresh={() => run(() => refresh())} />
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}
        {!user ? (
          <>
            <Text style={styles.eyebrow}>YOUR CARE, CONNECTED</Text>
            <Text style={styles.heroTitle}>
              A healthier life.{'\n'}A little more peace of mind.
            </Text>
            <Hint>A familiar team and your lifelong health story, wherever life takes you.</Hint>
            {screen === 'signup' ? (
              <>
                <Title>Join your care community</Title>
                <Input
                  label="Full name"
                  value={form.name || ''}
                  onChangeText={(v: string) => update('name', v)}
                />
                <Input
                  label="Email"
                  value={form.email || ''}
                  onChangeText={(v: string) => update('email', v)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Input
                  label="Phone (+27…)"
                  value={form.phone || ''}
                  onChangeText={(v: string) => update('phone', v)}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Delivery address"
                  value={form.address || ''}
                  onChangeText={(v: string) => update('address', v)}
                />
                <Hint>
                  Confirm the coordinates of your delivery address. Service is within 20 km of
                  central Durban.
                </Hint>
                <View style={styles.twoColumns}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Latitude"
                      value={form.lat || ''}
                      onChangeText={(v: string) => update('lat', v)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Longitude"
                      value={form.lng || ''}
                      onChangeText={(v: string) => update('lng', v)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
                <Hint>{SUBSCRIPTION_NOTICE}</Hint>
                {Object.entries(TIERS).map(([k, t]) => (
                  <Action key={k} secondary={form.tier !== k} onPress={() => update('tier', k)}>
                    {t.name} · {money(t.amount)} / month
                  </Action>
                ))}
                {Object.entries(config?.consents || {}).map(([k, t]) => (
                  <View key={k} style={styles.switchRow}>
                    <Text style={styles.switchText}>
                      {String(t)}
                      {k === 'care' ? ' (Required)' : ' (Optional)'}
                    </Text>
                    <Switch
                      value={!!form[k]}
                      onValueChange={(v) => update(k, v)}
                      trackColor={{ true: '#087783' }}
                    />
                  </View>
                ))}
                <Action
                  disabled={busy || !form.care}
                  onPress={() =>
                    run(async () => {
                      const c = await call('/auth/register', 'POST', {
                        name: form.name,
                        email: form.email,
                        phone: form.phone,
                        address: form.address,
                        geo: { lat: Number(form.lat), lng: Number(form.lng) },
                        tier: form.tier || 'monitor',
                        consents: {
                          care: !!form.care,
                          communications: !!form.communications,
                          delivery: !!form.delivery,
                        },
                      });
                      setChallenge(c);
                      setScreen('');
                    })
                  }
                >
                  Create account
                </Action>
                <Action secondary onPress={() => setScreen('')}>
                  Back to sign in
                </Action>
              </>
            ) : (
              <Card>
                {!challenge ? (
                  <>
                    <Title>Welcome to your care space</Title>
                    <Input
                      label="Email address"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                    <Action
                      disabled={busy}
                      onPress={() =>
                        run(async () =>
                          setChallenge(
                            await call('/auth/request-otp', 'POST', { email, portal: 'member' }),
                          ),
                        )
                      }
                    >
                      Send verification code
                    </Action>
                    <Action secondary onPress={() => open('signup', { tier: 'monitor' })}>
                      Create a member account
                    </Action>
                    {config?.demo && (
                      <>
                        <Hint>Explore with fictional records.</Hint>
                        <Action
                          secondary
                          onPress={() =>
                            run(async () =>
                              authenticate(
                                await call('/demo/login', 'POST', { role: 'member', native: true }),
                              ),
                            )
                          }
                        >
                          Explore member demo
                        </Action>
                        <Action
                          secondary
                          onPress={() =>
                            run(async () =>
                              authenticate(
                                await call('/demo/login', 'POST', { role: 'driver', native: true }),
                              ),
                            )
                          }
                        >
                          Explore driver demo
                        </Action>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Title>Verify your email</Title>
                    <Input
                      label="Six-digit code"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                    {challenge.demoOtp && (
                      <Hint>Local test code: {challenge.demoOtp}. No email was sent.</Hint>
                    )}
                    <Action
                      disabled={busy}
                      onPress={() =>
                        run(async () =>
                          authenticate(
                            await call('/auth/verify', 'POST', {
                              challengeId: challenge.challengeId,
                              code,
                              native: true,
                            }),
                          ),
                        )
                      }
                    >
                      Verify and continue
                    </Action>
                    <Action secondary onPress={() => setChallenge(null)}>
                      Request a new code
                    </Action>
                  </>
                )}
              </Card>
            )}
          </>
        ) : screen ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setScreen('');
                setForm({});
                setError('');
              }}
            >
              <Text style={styles.back}>← Back</Text>
            </Pressable>
            {screen === 'reading' && (
              <>
                <Title>Add a reading</Title>
                <Hint>
                  Use fictional readings. Sample flags do not provide staffed monitoring or clinical
                  care.
                </Hint>
                {['blood_pressure', 'glucose', 'heart_rate', 'weight', 'spo2', 'temperature'].map(
                  (t) => (
                    <Action key={t} secondary={form.type !== t} onPress={() => update('type', t)}>
                      {pretty(t)}
                    </Action>
                  ),
                )}
                <Input
                  label={
                    form.type === 'blood_pressure'
                      ? 'Systolic (mmHg)'
                      : `Reading (${({ glucose: 'mmol/L', heart_rate: 'bpm', weight: 'kg', spo2: '%', temperature: '°C' } as Data)[form.type] || ''})`
                  }
                  value={form.value || ''}
                  onChangeText={(v: string) => update('value', v)}
                  keyboardType="decimal-pad"
                />
                {form.type === 'blood_pressure' && (
                  <Input
                    label="Diastolic (mmHg)"
                    value={form.secondary || ''}
                    onChangeText={(v: string) => update('secondary', v)}
                    keyboardType="number-pad"
                  />
                )}
                <Action
                  disabled={busy}
                  onPress={() =>
                    run(() =>
                      save(
                        `/members/${mid}/vitals`,
                        {
                          type: form.type || 'blood_pressure',
                          value: Number(form.value),
                          ...(form.type === 'blood_pressure'
                            ? { secondary: Number(form.secondary) }
                            : {}),
                          source: 'manual',
                          takenAt: new Date().toISOString(),
                        },
                        'Reading saved for your care team.',
                      ),
                    )
                  }
                >
                  Save my reading
                </Action>
              </>
            )}
            {screen === 'consult' && (
              <>
                <Title>Make time for your health</Title>
                <Action
                  secondary={form.mode !== 'virtual'}
                  onPress={() => update('mode', 'virtual')}
                >
                  Planned virtual consult · sample request
                </Action>
                <Action secondary={form.mode !== 'home'} onPress={() => update('mode', 'home')}>
                  Home visit · R 1,850
                </Action>
                <Input
                  label="How can we help?"
                  value={form.reason || ''}
                  onChangeText={(v: string) => update('reason', v)}
                  multiline
                  numberOfLines={5}
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Request the soonest available time</Text>
                  <Switch value={!!form.soon} onValueChange={(v) => update('soon', v)} />
                </View>
                {form.mode === 'home' && (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>
                      I accept R 1,850, invoiced on booking and charged on completion.
                    </Text>
                    <Switch
                      value={!!form.feeAccepted}
                      onValueChange={(v) => update('feeAccepted', v)}
                    />
                  </View>
                )}
                <Hint>
                  Weekdays, 08:00–17:00. Not an emergency service. Call 112 in an emergency.
                </Hint>
                <Action
                  disabled={busy}
                  onPress={() =>
                    run(() =>
                      save(
                        `/members/${mid}/consults`,
                        {
                          reason: form.reason,
                          mode: form.mode || 'virtual',
                          urgency: form.soon ? 'soon' : 'routine',
                          feeAccepted: !!form.feeAccepted,
                        },
                        'Your team will confirm the appointment time.',
                      ),
                    )
                  }
                >
                  Save sample appointment request
                </Action>
              </>
            )}
            {screen === 'emergency' && form.summary && (
              <>
                <Title>{form.summary.name}</Title>
                <Card>
                  <Text style={styles.eyebrow}>ALLERGIES</Text>
                  <Text style={styles.body}>
                    {form.summary.allergies?.join(', ') || 'None recorded'}
                  </Text>
                  <Text style={styles.eyebrow}>CONDITIONS</Text>
                  <Text style={styles.body}>
                    {form.summary.conditions?.join(', ') || 'None recorded'}
                  </Text>
                </Card>
                <Card>
                  <Title>Current medication</Title>
                  {form.summary.medications?.map((m: Data) => (
                    <Text key={m.id} style={styles.body}>
                      {m.drug} {m.strength} · {m.directions}
                    </Text>
                  ))}
                </Card>
                <Card>
                  <Title>Last readings</Title>
                  {form.summary.vitals?.map((v: Data) => (
                    <Text key={v.id} style={styles.body}>
                      {pretty(v.type)}: {v.value}
                      {v.secondary ? `/${v.secondary}` : ''} {v.unit}
                      {'\n'}
                      {day(v.takenAt)}
                    </Text>
                  ))}
                </Card>
                <Card>
                  <Title>Contacts & medical aid</Title>
                  <Text style={styles.body}>
                    {form.summary.doctor?.name} · {form.summary.doctor?.phone}
                  </Text>
                  <Text style={styles.body}>
                    {form.summary.nextOfKin?.name} · {form.summary.nextOfKin?.phone}
                  </Text>
                  <Text style={styles.body}>
                    {form.summary.medicalAidScheme} · {form.summary.medicalAidNumber}
                  </Text>
                </Card>
              </>
            )}
            {screen === 'delivery' && (
              <>
                <Title>Confirm receipt</Title>
                <Input
                  label="Recipient name"
                  value={form.recipientName || ''}
                  onChangeText={(v: string) => update('recipientName', v)}
                />
                {form.order.requiresId && (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Recipient ID checked</Text>
                    <Switch
                      value={!!form.idChecked}
                      onValueChange={(v) => update('idChecked', v)}
                    />
                  </View>
                )}
                {form.order.requiresTemperature && (
                  <Input
                    label="Cold-chain temperature (°C)"
                    value={form.temperature || ''}
                    onChangeText={(v: string) => update('temperature', v)}
                    keyboardType="decimal-pad"
                  />
                )}
                <Hint>
                  Local demonstration: recipient confirmation only. Signature/photo proof and
                  offline sync are not yet implemented.
                </Hint>
                <Action
                  disabled={busy}
                  onPress={() =>
                    run(() =>
                      save(
                        `/orders/${form.order.id}/advance`,
                        {
                          status: 'delivered',
                          recipientName: form.recipientName,
                          idChecked: !!form.idChecked,
                          ...(form.temperature ? { temperature: Number(form.temperature) } : {}),
                        },
                        'Demo receipt recorded.',
                      ),
                    )
                  }
                >
                  Record demo delivery
                </Action>
              </>
            )}
          </>
        ) : user.role === 'driver' ? (
          <>
            <Text style={styles.eyebrow}>DELIVERED WITH CARE</Text>
            <Text style={styles.heroTitle}>Your delivery round.</Text>
            <Hint>Weekdays, 08:00–17:00 · Durban</Hint>
            {data?.orders?.map((o: Data) => (
              <Card key={o.id}>
                <Text style={styles.pill}>{pretty(o.status)}</Text>
                <Title>{o.name}</Title>
                <Text style={styles.body}>{o.pharmacy}</Text>
                <Hint>{o.address}</Hint>
                {o.status === 'ready' && (
                  <Action
                    disabled={busy}
                    onPress={() =>
                      run(() =>
                        save(
                          `/orders/${o.id}/advance`,
                          { status: 'collected' },
                          'Collection confirmed.',
                        ),
                      )
                    }
                  >
                    Confirm collection
                  </Action>
                )}
                {o.status === 'collected' && (
                  <Action onPress={() => open('delivery', { order: o })}>Confirm delivery</Action>
                )}
              </Card>
            ))}
            <Action
              secondary
              onPress={() =>
                run(async () => {
                  await call('/auth/logout', 'POST', {});
                  await SecureStore.deleteItemAsync('pw.session');
                  setUser(null);
                  setToken(null);
                  setData(null);
                })
              }
            >
              Sign out
            </Action>
          </>
        ) : user.role === 'family' ? (
          <>
            <Title>{data?.member?.name}’s care</Title>
            <Hint>Read-only access, shared by consent.</Hint>
            <Card>
              <Title>Health summary</Title>
              <Text style={styles.body}>
                {data?.summary?.conditions?.join(', ') || 'No conditions recorded'}
              </Text>
              <Text style={styles.body}>
                Allergies: {data?.summary?.allergies?.join(', ') || 'None recorded'}
              </Text>
            </Card>
            {data?.updates?.map((u: Data) => (
              <Card key={u.id}>
                <Text style={styles.body}>
                  {pretty(u.mode)} consult · {pretty(u.status)}
                </Text>
                <Hint>{day(u.scheduledAt)}</Hint>
              </Card>
            ))}
            {data?.emergencyAllowed && (
              <Action
                onPress={() =>
                  run(async () =>
                    open('emergency', { summary: await call(`/members/${mid}/emergency`) }),
                  )
                }
              >
                Emergency summary
              </Action>
            )}
          </>
        ) : (
          <>
            {tab === 'Home' && (
              <>
                <Text style={styles.eyebrow}>A LITTLE CARE, EVERY DAY</Text>
                <Text style={styles.heroTitle}>
                  Hello, {data?.member?.preferredName || user.name.split(' ')[0]}.
                </Text>
                <Hint>Let’s take good care of you today.</Hint>
                <View style={styles.hero}>
                  <Text style={styles.heroHeading}>
                    Wellbeing is a journey.{'\n'}We’re with you.
                  </Text>
                  <Text style={styles.heroCopy}>
                    Your readings, your care team, your next steps.
                  </Text>
                  <Action secondary onPress={() => open('reading', { type: 'blood_pressure' })}>
                    ＋ Add today’s reading
                  </Action>
                </View>
                <Title>Your latest readings</Title>
                {['blood_pressure', 'glucose', 'heart_rate'].map((type) => {
                  const v = data?.vitals
                    ?.filter((v: Data) => v.type === type)
                    .sort((a: Data, b: Data) => b.takenAt.localeCompare(a.takenAt))[0];
                  return (
                    <Card key={type}>
                      <Text style={styles.eyebrow}>{pretty(type)}</Text>
                      <Text style={styles.reading}>
                        {v ? `${v.value}${v.secondary ? `/${v.secondary}` : ''}` : '—'}{' '}
                        <Text style={styles.units}>{v?.unit}</Text>
                      </Text>
                      <Hint>{v ? day(v.takenAt) : 'Add your first reading'}</Hint>
                    </Card>
                  );
                })}
                <Action onPress={() => open('consult', { mode: 'virtual' })}>
                  Request a consult
                </Action>
                <Card>
                  <Title>Your care team</Title>
                  <Text style={styles.body}>
                    {data?.member?.doctor?.name || 'Doctor to be assigned'}
                  </Text>
                  <Hint>{data?.member?.coordinator}</Hint>
                </Card>
              </>
            )}
            {tab === 'Vault' && (
              <>
                <Text style={styles.heroTitle}>Health Vault</Text>
                <Hint>Your lifelong health story, in one place.</Hint>
                <Action
                  secondary
                  onPress={() =>
                    run(async () =>
                      open('emergency', { summary: await call(`/members/${mid}/emergency`) }),
                    )
                  }
                >
                  Emergency summary
                </Action>
                <Card>
                  <Title>Your health profile</Title>
                  <Text style={styles.body}>
                    Conditions: {data?.member?.conditions?.join(', ') || 'None recorded'}
                  </Text>
                  <Text style={styles.body}>
                    Allergies: {data?.member?.allergies?.join(', ') || 'None recorded'}
                  </Text>
                </Card>
                <Title>Documents</Title>
                {data?.documents?.length ? (
                  data.documents.map((d: Data) => (
                    <Card key={d.id}>
                      <Text style={styles.body}>{d.name}</Text>
                      <Hint>
                        {d.documentDate} · {pretty(d.status)}
                      </Hint>
                      <Text style={styles.body}>
                        {d.extractedText || 'Awaiting staff verification'}
                      </Text>
                    </Card>
                  ))
                ) : (
                  <Hint>Your vault is empty. Records appear as your care journey begins.</Hint>
                )}
                <Title>Medication</Title>
                {data?.medications?.map((m: Data) => (
                  <Card key={m.id}>
                    <Text style={styles.body}>
                      {m.drug} {m.strength}
                    </Text>
                    <Hint>{m.directions}</Hint>
                    <Text style={styles.body}>
                      {pretty(m.status)} · {day(m.dispensedAt)}
                    </Text>
                  </Card>
                ))}
                <Hint>Document uploads and data export are available in the web portal.</Hint>
              </>
            )}
            {tab === 'Care' && (
              <>
                <Text style={styles.heroTitle}>Your care, connected.</Text>
                <Action onPress={() => open('consult', { mode: 'virtual' })}>
                  Request a consult
                </Action>
                <Action secondary onPress={() => open('consult', { mode: 'home' })}>
                  Book a home visit · R 1,850
                </Action>
                {data?.consults?.map((c: Data) => (
                  <Card key={c.id}>
                    <Text style={styles.pill}>{pretty(c.status)}</Text>
                    <Title>{c.reason}</Title>
                    <Hint>
                      {day(c.scheduledAt)} · {pretty(c.mode)}
                    </Hint>
                    <Text style={styles.body}>{c.doctorName || 'Care team will confirm'}</Text>
                    {c.signedAt && <Text style={styles.note}>{c.note}</Text>}
                  </Card>
                ))}
              </>
            )}
            {tab === 'Deliveries' && (
              <>
                <Text style={styles.heroTitle}>Care, to your door.</Text>
                <Hint>Follow your prescription through each step.</Hint>
                {data?.orders?.length ? (
                  data.orders.map((o: Data) => (
                    <Card key={o.id}>
                      <Title>{o.description || 'Prescription delivery'}</Title>
                      <Text style={styles.pill}>{pretty(o.status)}</Text>
                      <Hint>{o.pharmacy}</Hint>
                      {o.events?.map((e: Data, i: number) => (
                        <Text key={i} style={styles.body}>
                          ✓ {pretty(e.status)} · {day(e.at)}
                        </Text>
                      ))}
                      <Hint>{o.address}</Hint>
                    </Card>
                  ))
                ) : (
                  <Hint>Your delivery progress will appear here.</Hint>
                )}
              </>
            )}
            {tab === 'More' && (
              <>
                <Text style={styles.heroTitle}>Your care. Your choices.</Text>
                <Card>
                  <Title>Your demonstration membership</Title>
                  <Hint>{SUBSCRIPTION_NOTICE}</Hint>
                  <Text style={styles.reading}>{TIERS[data?.member?.tier as Tier]?.name}</Text>
                  <Hint>{money(data?.subscription?.amount || 0)} / month · incl. VAT</Hint>
                  {Object.entries(TIERS).map(([tier, t]) => (
                    <Action
                      key={tier}
                      secondary
                      onPress={() =>
                        run(() =>
                          save(
                            `/members/${mid}/membership`,
                            { tier, paymentMethod: 'card' },
                            'Membership selection saved. Active plan changes start at the next billing date.',
                          ),
                        )
                      }
                    >
                      {t.name} · {money(t.amount)}
                    </Action>
                  ))}
                  <Hint>
                    Medication and external services are billed separately. Home visits: R 1,850.
                    Cancel on 20 business days’ notice.
                  </Hint>
                </Card>
                <Title>Invoices</Title>
                {data?.invoices?.map((i: Data) => (
                  <Card key={i.id}>
                    <Text style={styles.body}>{i.description}</Text>
                    <Hint>
                      {money(i.amount)} · {pretty(i.status)}
                    </Hint>
                    {i.status === 'due' && config?.demo && (
                      <Action
                        secondary
                        onPress={() =>
                          run(() =>
                            save(
                              `/invoices/${i.id}/pay-test`,
                              {},
                              'Test payment recorded. No money was charged.',
                            ),
                          )
                        }
                      >
                        Pay test invoice
                      </Action>
                    )}
                  </Card>
                ))}
                <Card>
                  <Title>Family access</Title>
                  {data?.family
                    ?.filter((f: Data) => !f.revokedAt)
                    .map((f: Data) => (
                      <View key={f.id}>
                        <Text style={styles.body}>
                          {f.name} · {pretty(f.scope)}
                        </Text>
                        <Action
                          secondary
                          onPress={() =>
                            Alert.alert(
                              'Revoke access?',
                              `${f.name} will lose access immediately.`,
                              [
                                { text: 'Keep access', style: 'cancel' },
                                {
                                  text: 'Revoke',
                                  style: 'destructive',
                                  onPress: () =>
                                    run(async () => {
                                      await call(`/family/${f.id}`, 'DELETE');
                                      await refresh();
                                    }),
                                },
                              ],
                            )
                          }
                        >
                          Revoke access
                        </Action>
                      </View>
                    ))}
                  <Hint>Add family viewers and manage detailed consent in the web portal.</Hint>
                </Card>
                <Card>
                  <Title>Reading comfort</Title>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Roomier layout</Text>
                    <Switch value={large} onValueChange={setLarge} />
                  </View>
                  <Hint>Text follows your phone’s accessibility text-size settings.</Hint>
                </Card>
                <Action secondary onPress={() => Linking.openURL('tel:112')}>
                  Emergency · Call 112
                </Action>
                <Action
                  secondary
                  onPress={() =>
                    run(async () => {
                      await call('/auth/logout', 'POST', {});
                      await SecureStore.deleteItemAsync('pw.session');
                      setUser(null);
                      setToken(null);
                      setData(null);
                      setTab('Home');
                    })
                  }
                >
                  Sign out
                </Action>
              </>
            )}
          </>
        )}
        {busy && <ActivityIndicator color="#087783" style={{ margin: 16 }} />}
        <Text style={styles.footer}>Not an emergency service. Care team weekdays 08:00–17:00.</Text>
      </ScrollView>
      {user?.role === 'member' && !screen && (
        <View style={styles.tabs}>
          {['Home', 'Vault', 'Care', 'Deliveries', 'More'].map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => {
                setTab(t);
                setError('');
              }}
              style={[styles.tab, tab === t && styles.selectedTab]}
            >
              <Text style={[styles.tabText, tab === t && { color: '#087783', fontWeight: '700' }]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f7fa' },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#dce7ed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 29,
    color: '#15344b',
  },
  wordmark: { fontSize: 9, letterSpacing: 4, color: '#586e7f', marginTop: 2 },
  refresh: { fontSize: 30, color: '#087783', padding: 10 },
  demo: { paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#e0f2f3' },
  demoText: { fontSize: 10, color: '#466777' },
  content: { padding: 21, paddingBottom: 35 },
  heroTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 37,
    lineHeight: 43,
    color: '#15344b',
    marginVertical: 13,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    color: '#586e7f',
    marginTop: 6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    color: '#15344b',
    marginBottom: 12,
    marginTop: 6,
  },
  body: { fontSize: 16, color: '#486475', lineHeight: 25, marginBottom: 10 },
  hint: { fontSize: 14, color: '#586e7f', lineHeight: 22, marginBottom: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dce7ed',
    padding: 21,
    marginVertical: 9,
  },
  button: {
    minHeight: 49,
    padding: 15,
    backgroundColor: '#087783',
    borderRadius: 9,
    marginVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#ffffff', textAlign: 'center' },
  secondary: { backgroundColor: '#e0f2f3', borderWidth: 1, borderColor: '#c8e3e8' },
  field: { marginVertical: 9 },
  label: { fontSize: 13, color: '#486475', marginBottom: 9 },
  input: {
    fontSize: 17,
    color: '#15344b',
    padding: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#dce7ed',
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 13 },
  switchText: { flex: 1, fontSize: 14, lineHeight: 22, color: '#586e7f' },
  twoColumns: { flexDirection: 'row', gap: 12 },
  error: { padding: 16, borderRadius: 9, backgroundColor: '#fceee6', marginVertical: 10 },
  errorText: { fontSize: 14, color: '#925f42', lineHeight: 21 },
  hero: { backgroundColor: '#102f48', padding: 25, borderRadius: 18, marginVertical: 20 },
  heroHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 31,
    lineHeight: 38,
    color: '#ffffff',
    marginBottom: 17,
  },
  heroCopy: { fontSize: 14, lineHeight: 23, color: '#c4dce7', marginBottom: 15 },
  reading: { fontSize: 33, color: '#15344b', fontWeight: '500', marginVertical: 6 },
  units: { fontSize: 14, color: '#586e7f' },
  pill: {
    color: '#087783',
    backgroundColor: '#e0f2f3',
    fontSize: 12,
    padding: 8,
    alignSelf: 'flex-start',
    borderRadius: 5,
    marginBottom: 15,
  },
  note: {
    backgroundColor: '#e0f2f3',
    color: '#486475',
    padding: 15,
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: { fontSize: 10, lineHeight: 17, textAlign: 'center', color: '#586e7f', marginTop: 25 },
  tabs: {
    flexDirection: 'row',
    padding: 9,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#dce7ed',
    backgroundColor: '#fff',
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 8 },
  selectedTab: { backgroundColor: '#e0f2f3' },
  tabText: { fontSize: 11, color: '#586e7f' },
  back: { fontSize: 14, color: '#087783', paddingVertical: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { marginTop: 20, color: '#586e7f' },
});
