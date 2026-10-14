import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  FolderHeart,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Package,
  Phone,
  Pill,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Truck,
  Upload,
  UserRound,
  UsersRound,
  Video,
  X,
  Droplets,
  Eye,
  Printer,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  TIERS,
  PROTOTYPE_NOTICE,
  SUBSCRIPTION_NOTICE,
  HOME_VISIT_FEE,
  money,
  type Role,
  type Tier,
} from '../../../packages/core/domain.ts';
import './styles.css';
import { ThemePicker } from './themes.tsx';
declare const __SHARED_PREVIEW__: boolean;

type Data = Record<string, any>;
async function api(path: string, method = 'GET', body?: any) {
  if (__SHARED_PREVIEW__) return (await import('./preview-api.ts')).previewApi(path, method, body);
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Wellness-Client': 'app' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to complete this request.');
  return data;
}
const date = (s: string, withTime = false) =>
  s
    ? new Intl.DateTimeFormat('en-ZA', {
        day: 'numeric',
        month: 'short',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        timeZone: 'Africa/Johannesburg',
      }).format(new Date(s))
    : 'To be confirmed';
const fullDate = () =>
  new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date());
const initials = (s: string) =>
  s
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('') || 'PW';
const titleCase = (s: string) =>
  s?.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase()) || '';
const latest = (data: Data, type: string) =>
  data.vitals
    ?.filter((v: Data) => v.type === type)
    .sort((a: Data, b: Data) => b.takenAt.localeCompare(a.takenAt))[0];
const todayKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
const isToday = (s: string) =>
  !!s &&
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date(s)) ===
    todayKey();

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="icon-button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}
function Button({
  children,
  onClick,
  kind = 'primary',
  type = 'button',
  disabled = false,
  ...rest
}: any) {
  return (
    <button
      className={`button ${kind}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
function Badge({ children, tone = 'green' }: any) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Avatar({ name, kind = 'sage', small = false }: any) {
  return <span className={`avatar ${kind} ${small ? 'small' : ''}`}>{initials(name)}</span>;
}
function Empty({ icon: Icon = FolderHeart, title, children, action }: any) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <HeartPulse size={25} strokeWidth={1.8} />
      </span>
      <span>
        proactive<span className="brand-sub">WELLNESS</span>
      </span>
    </div>
  );
}
function Modal({ title, subtitle, children, close, wide = false }: any) {
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const items = [
          ...document.querySelectorAll<HTMLElement>(
            '.modal button:not(:disabled),.modal input,.modal select,.modal textarea,.modal a',
          ),
        ];
        if (!items.length) return;
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.querySelector<HTMLElement>('.modal input,.modal button')?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', listener);
      document.body.style.overflow = '';
      old?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="Close dialog" onClick={close}>
            <X size={22} />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
function Form({
  children,
  onSubmit,
  label = 'Save changes',
}: {
  children: ReactNode;
  onSubmit: (f: FormData) => Promise<any>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError('');
        setBusy(true);
        try {
          await onSubmit(f);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : label}
          <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
function Field({ label, children, hint }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function SectionTitle({ eyebrow, title, description, action }: any) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Notice({ children, kind = 'info' }: any) {
  return (
    <div className={`notice ${kind}`}>
      <AlertCircle size={17} />
      <span>{children}</span>
    </div>
  );
}

function Auth({ config, onLogin }: { config: Data; onLogin: () => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'waitlist'>('login'),
    [challenge, setChallenge] = useState<Data | null>(null),
    [error, setError] = useState('');
  const [geo, setGeo] = useState({ lat: '', lng: '' }),
    [locating, setLocating] = useState(false);
  const demoLogin = async () => {
    try {
      await api('/demo/login', 'POST', { role: 'member' });
      await onLogin();
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Logo />
        <div>
          <p className="eyebrow">YOUR CARE, CONNECTED</p>
          <h1>
            A healthier life.
            <br />A little more
            <br />
            <em>peace of mind.</em>
          </h1>
          <p>
            A familiar care team. Your health story in one place.
            <br />
            And thoughtful support, wherever life takes you.
          </p>
          <div className="auth-illustration">
            <HeartHandshake size={125} strokeWidth={0.8} />
            <span className="orbit o1" />
            <span className="orbit o2" />
            <span className="floating-dot" />
          </div>
        </div>
        <small>PERSONAL CARE · DURBAN, SOUTH AFRICA</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">WELCOME TO PROACTIVE WELLNESS</span>
          <Notice>{PROTOTYPE_NOTICE}</Notice>
          <h2>
            {mode === 'signup'
              ? 'Let’s get to know you.'
              : mode === 'verify'
                ? 'One last step.'
                : mode === 'waitlist'
                  ? 'Care, a little closer soon.'
                  : 'Your wellbeing starts here.'}
          </h2>
          <p>
            {mode === 'signup'
              ? 'Create a fictional test account to explore the Health Vault.'
              : mode === 'verify'
                ? 'Enter your six-digit verification code.'
                : mode === 'waitlist'
                  ? 'We’ll record your interest in care beyond our current service area.'
                  : 'Sign in to explore the care workflow demonstration.'}
          </p>
          {mode === 'login' && (
            <>
              <Form
                label="Generate local test code"
                onSubmit={async (f) => {
                  const c = await api('/auth/request-otp', 'POST', {
                    email: f.get('email'),
                    portal: f.get('portal'),
                  });
                  setChallenge(c);
                  setMode('verify');
                }}
              >
                <Field label="Email address">
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </Field>
                <Field label="Sign in as">
                  <select name="portal">
                    <option value="member">Member, family or driver</option>
                    <option value="staff">Care team / back office</option>
                  </select>
                </Field>
              </Form>
              <div className="auth-links">
                New to Proactive Wellness?{' '}
                <button onClick={() => setMode('signup')}>
                  Create a test account <ArrowUpRight size={14} />
                </button>
              </div>
              {config.demo && (
                <div className="demo-entry">
                  <Badge tone="sand">LOCAL DEMO</Badge>
                  <p>
                    Take a look around with fictional records.
                    <br />
                    No real payments or messages.
                  </p>
                  <Button onClick={demoLogin} kind="secondary">
                    Explore the member demo <ArrowRight size={17} />
                  </Button>
                </div>
              )}
            </>
          )}
          {mode === 'signup' && (
            <Form
              label="Create test account"
              onSubmit={async (f) => {
                const c = await api('/auth/register', 'POST', {
                  name: f.get('name'),
                  email: f.get('email'),
                  phone: f.get('phone'),
                  address: f.get('address'),
                  geo: { lat: Number(geo.lat), lng: Number(geo.lng) },
                  tier: f.get('tier'),
                  consents: {
                    care: f.get('care') === 'on',
                    communications: f.get('communications') === 'on',
                    delivery: f.get('delivery') === 'on',
                  },
                });
                setChallenge(c);
                setMode('verify');
              }}
            >
              <div className="form-grid">
                <Field label="Full name">
                  <input name="name" required minLength={2} autoComplete="name" />
                </Field>
                <Field label="Mobile number">
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+27821234567"
                    required
                    pattern="\+27[0-9]{9}"
                  />
                </Field>
              </div>
              <Field label="Email address">
                <input type="email" name="email" required autoComplete="email" />
              </Field>
              <Field label="Delivery address">
                <input name="address" required minLength={8} autoComplete="street-address" />
              </Field>
              <div className="location-entry">
                <Button
                  kind="ghost"
                  onClick={() => {
                    setLocating(true);
                    navigator.geolocation.getCurrentPosition(
                      (p) => {
                        setGeo({ lat: String(p.coords.latitude), lng: String(p.coords.longitude) });
                        setLocating(false);
                      },
                      () => {
                        setError(
                          'Location could not be read. Enter the coordinates of your delivery address.',
                        );
                        setLocating(false);
                      },
                    );
                  }}
                >
                  <MapPin size={16} />
                  {locating ? 'Finding location…' : 'Use my current location'}
                </Button>
                <small>
                  Confirm this is your delivery location. Within 20 km of central Durban.
                </small>
                <div className="form-grid">
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={geo.lat}
                      onChange={(e) => setGeo({ ...geo, lat: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Longitude">
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={geo.lng}
                      onChange={(e) => setGeo({ ...geo, lng: e.target.value })}
                      required
                    />
                  </Field>
                </div>
              </div>
              <Notice>{SUBSCRIPTION_NOTICE}</Notice>
              <Field label="Your demonstration membership">
                <select name="tier" defaultValue="monitor">
                  {Object.entries(TIERS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name} · {money(v.amount)} / month
                    </option>
                  ))}
                </select>
              </Field>
              <div className="consent-checks">
                {Object.entries(config.consents).map(([k, v]) => (
                  <label key={k}>
                    <input name={k} type="checkbox" required={k === 'care'} />
                    <span>
                      {String(v)}
                      {k === 'care' ? ' (Required)' : ' (Optional)'}
                    </span>
                  </label>
                ))}
              </div>
              <small>
                Consent version {config.consentVersion}. Device coordinates are checked against the
                launch radius; address verification is required before live service.
              </small>
            </Form>
          )}
          {mode === 'verify' && (
            <>
              <Form
                label="Verify and continue"
                onSubmit={async (f) => {
                  await api('/auth/verify', 'POST', {
                    challengeId: challenge?.challengeId,
                    code: f.get('code'),
                  });
                  await onLogin();
                }}
              >
                <Field label="Verification code">
                  <input
                    name="code"
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    minLength={6}
                    pattern="[0-9]{6}"
                    required
                  />
                </Field>
                {challenge?.demoOtp && (
                  <Notice>
                    Local test code: <strong>{challenge.demoOtp}</strong>. No email was sent.
                    Expires in five minutes.
                  </Notice>
                )}
              </Form>
            </>
          )}
          {mode === 'waitlist' && (
            <Form
              label="Join the local waitlist"
              onSubmit={async (f) => {
                await api('/waitlist', 'POST', Object.fromEntries(f));
                setError('Your interest has been recorded locally. No message was sent.');
              }}
            >
              <Field label="Name">
                <input name="name" required />
              </Field>
              <Field label="Email">
                <input name="email" type="email" required />
              </Field>
              <Field label="Area or suburb">
                <input name="area" required />
              </Field>
            </Form>
          )}
          {error && <Notice>{error}</Notice>}
          {mode !== 'login' && (
            <div className="auth-links">
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
              {mode === 'signup' && (
                <button onClick={() => setMode('waitlist')}>
                  Outside Durban? Join the waitlist
                </button>
              )}
            </div>
          )}
          <div className="auth-foot">
            <LockKeyhole size={13} /> Your health story belongs to you.
          </div>
        </div>
      </main>
    </div>
  );
}

const memberNav = [
  ['overview', 'Overview', Home],
  ['vault', 'Health Vault', FolderHeart],
  ['care', 'My care', Stethoscope],
  ['medication', 'Medication', Pill],
  ['deliveries', 'Deliveries', Truck],
  ['membership', 'Membership', CreditCard],
  ['family', 'Family access', UsersRound],
] as const;
const staffNav = [
  ['overview', 'Care overview', LayoutDashboard],
  ['members', 'Members', UsersRound],
  ['queue', 'Nurse queue', HeartPulse],
  ['consults', 'Consults', Stethoscope],
  ['orders', 'Script to door', Package],
  ['documents', 'Document review', FileText],
  ['clinics', 'Village clinics', CalendarDays],
  ['billing', 'Billing', CreditCard],
  ['audit', 'Audit trail', ShieldCheck],
] as const;
function App() {
  const [config, setConfig] = useState<Data | null>(null),
    [user, setUser] = useState<Data | null>(null),
    [data, setData] = useState<Data | null>(null),
    [staff, setStaff] = useState<Data | null>(null),
    [page, setPage] = useState('overview'),
    [modal, setModal] = useState<Data | null>(null),
    [toast, setToast] = useState(''),
    [boot, setBoot] = useState(true),
    [error, setError] = useState(''),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(''),
    [memberId, setMemberId] = useState('');
  const [large, setLarge] = useState(localStorage.getItem('pw-large') === 'true'),
    [contrast, setContrast] = useState(localStorage.getItem('pw-contrast') === 'true');
  const isStaff = !!user && !['member', 'family'].includes(user.role),
    isFamily = user?.role === 'family';
  const load = useCallback(async () => {
    const { user: u } = await api('/me');
    setUser(u);
    if (['member', 'family'].includes(u.role)) {
      try {
        setData(await api('/portal'));
        setError('');
      } catch (e: any) {
        setData(null);
        setError(e.message);
      }
      setStaff(null);
    } else {
      setStaff(await api('/staff/overview'));
      if (memberId && ['doctor', 'nurse', 'admin'].includes(u.role))
        setData(await api(`/portal?memberId=${memberId}`));
      else setData(null);
    }
  }, [memberId]);
  useEffect(() => {
    api('/config')
      .then(setConfig)
      .then(() => load())
      .catch(() => {})
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('large-text', large);
    localStorage.setItem('pw-large', String(large));
  }, [large]);
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', contrast);
    localStorage.setItem('pw-contrast', String(contrast));
  }, [contrast]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const close = useCallback(() => setModal(null), []);
  const notify = (msg: string) => setToast(msg);
  const act = async (
    path: string,
    body?: any,
    method = 'POST',
    message = 'Saved successfully.',
  ) => {
    await api(path, method, body);
    await load();
    close();
    notify(message);
  };
  const go = (p: string) => {
    setPage(p);
    setMenu(false);
    setQuery('');
    setError('');
  };
  const openMember = async (id: string) => {
    try {
      const d = await api(`/portal?memberId=${id}`);
      setMemberId(id);
      setData(d);
      setPage('member-record');
      setQuery('');
    } catch (e: any) {
      notify(e.message);
    }
  };
  const emergency = async () => {
    try {
      setModal({ kind: 'emergency', summary: await api(`/members/${data?.member.id}/emergency`) });
    } catch (e: any) {
      notify(e.message);
    }
  };
  if (boot)
    return (
      <div className="loading-screen">
        <Logo />
        <p>Getting your care space ready…</p>
      </div>
    );
  if (!config)
    return (
      <div className="loading-screen">
        <h2>Unable to connect</h2>
        <p>Start the app server and refresh this page.</p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    );
  if (!user)
    return (
      <Auth
        config={config}
        onLogin={async () => {
          setMemberId('');
          setPage('overview');
          await load();
        }}
      />
    );
  const allowedNav = isFamily
    ? [
        ['overview', 'Member summary', Heart],
        ['family-updates', 'Care updates', Bell],
      ]
    : isStaff
      ? staffNav.filter(([k]) =>
          user.role === 'driver'
            ? ['overview', 'orders'].includes(k)
            : user.role === 'pharmacy'
              ? ['overview', 'orders'].includes(k)
              : user.role === 'doctor'
                ? !['billing', 'audit'].includes(k)
                : user.role === 'nurse'
                  ? !['billing', 'audit'].includes(k)
                  : !['queue', 'consults'].includes(k),
        )
      : memberNav;
  const pageLabel: string =
    page === 'member-record'
      ? 'Member record'
      : page === 'settings'
        ? 'Settings'
        : String(allowedNav.find((x) => x[0] === page)?.[1] || 'Overview');
  const mid = data?.member?.id;
  const memberProps = {
    data,
    go,
    open: (kind: string, extra: Data = {}) => setModal({ kind, ...extra }),
    act,
    emergency,
    notify,
  };
  return (
    <div
      className={`app-shell ${menu ? 'menu-open' : ''}`}
      onClickCapture={(e) => {
        if (__SHARED_PREVIEW__ && (e.target as HTMLElement).closest('a[href^="/api/"]')) {
          e.preventDefault();
          notify(
            'Downloads and personal documents are available in the locally installed app. This review uses fictional sample records only.',
          );
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">
          {isFamily ? 'FAMILY SPACE' : isStaff ? 'CARE TEAM WORKSPACE' : 'YOUR WELLNESS SPACE'}
        </div>
        <nav aria-label="Main navigation">
          {allowedNav.map(([k, label, Icon]: any) => (
            <button key={k} className={page === k ? 'active' : ''} onClick={() => go(k)}>
              <Icon size={20} />
              <span>{label}</span>
              {k === 'deliveries' && data?.orders?.some((o: Data) => o.status !== 'delivered') && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <span className="support-heart">
              <HeartHandshake size={21} />
            </span>
            <h4>
              A familiar voice,
              <br />
              when you need one.
            </h4>
            <p>
              Your team is here
              <br />
              weekdays, 8am–5pm.
            </p>
            <button onClick={() => setModal({ kind: 'support' })}>
              Contact your team <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`sidebar-settings ${page === 'settings' ? 'active' : ''}`}
            onClick={() => go('settings')}
          >
            <Settings size={19} /> Settings & accessibility
          </button>
          <button className="user-block" onClick={() => setModal({ kind: 'account' })}>
            <Avatar name={user.name} small />
            <span>
              <strong>{user.name}</strong>
              <small>
                {isStaff
                  ? titleCase(user.role)
                  : isFamily
                    ? 'Family viewer'
                    : `${TIERS[data?.member?.tier as Tier]?.name || 'New'} member`}
              </small>
            </span>
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>
      <div className="mobile-scrim" onClick={() => setMenu(false)} />
      <div className="workspace">
        <header className="topbar">
          <div className="top-left">
            <IconButton label="Open navigation" onClick={() => setMenu(!menu)}>
              <Menu className="mobile-menu-icon" size={22} />
            </IconButton>
            <span className="breadcrumb">
              {isStaff ? 'Care team' : isFamily ? 'Family' : 'Member portal'}
            </span>
            <ChevronRight size={13} />
            <strong>{pageLabel}</strong>
          </div>
          <div className="top-right">
            <span className="top-date">{fullDate()}</span>
            <IconButton
              label="Search records"
              onClick={() => {
                go(isStaff ? 'members' : 'vault');
                setTimeout(
                  () => document.querySelector<HTMLInputElement>('.search-input')?.focus(),
                  0,
                );
              }}
            >
              <Search size={19} />
            </IconButton>
            <IconButton label="View reminders" onClick={() => setModal({ kind: 'notifications' })}>
              <span className="notification-icon">
                <Bell size={19} />
                <i />
              </span>
            </IconButton>
            <Avatar small name={user.name} />
          </div>
        </header>
        {config.demo && (
          <div className="demo-bar">
            <span>
              <span className="demo-dot" /> Demo workspace{' '}
              <span className="demo-detail">· Fictional records · Simulated services</span>
            </span>
            <label>
              Preview as{' '}
              <select
                aria-label="Preview role"
                value={user.id.startsWith('user-') ? user.role : 'new-member'}
                onChange={async (e) => {
                  const role = e.target.value;
                  if (role === 'new-member') return;
                  try {
                    await api('/demo/login', 'POST', { role });
                    setMemberId('');
                    setPage('overview');
                    setData(null);
                    const u = await api('/me');
                    setUser(u.user);
                    if (['member', 'family'].includes(role)) {
                      try {
                        setData(await api('/portal'));
                        setError('');
                      } catch (e: any) {
                        setError(e.message);
                      }
                      setStaff(null);
                    } else {
                      setStaff(await api('/staff/overview'));
                      setError('');
                    }
                  } catch (e: any) {
                    notify(e.message);
                  }
                }}
              >
                {!user.id.startsWith('user-') && (
                  <option value="new-member">Your new member account</option>
                )}
                {[
                  ['member', 'Member'],
                  ['doctor', 'Doctor'],
                  ['nurse', 'Nurse'],
                  ['admin', 'Back office'],
                  ['pharmacy', 'Pharmacy'],
                  ['driver', 'Driver'],
                  ['family', 'Family viewer'],
                ].map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
        )}
        <div className="shared-review-note" role="note">
          {PROTOTYPE_NOTICE}
        </div>
        <ThemePicker />
        {config.sharedPreview && (
          <div className="shared-review-note">
            Private review · fictional records only. Sample changes last until refresh. No real
            care, messages or payments. Please use sample details.
          </div>
        )}
        <main id="main-content" className="main-content">
          {error && <Notice>{error}</Notice>}
          {page === 'settings' ? (
            <SettingsPage
              {...memberProps}
              large={large}
              contrast={contrast}
              setLarge={setLarge}
              setContrast={setContrast}
              config={config}
              user={user}
            />
          ) : isFamily ? (
            <FamilyView data={data} page={page} emergency={emergency} />
          ) : isStaff ? (
            <StaffView
              staff={staff}
              data={data}
              user={user}
              page={page}
              go={go}
              query={query}
              setQuery={setQuery}
              openMember={openMember}
              {...{ act, notify }}
              open={(kind: string, extra: Data = {}) => setModal({ kind, ...extra })}
            />
          ) : data ? (
            <>
              {page === 'overview' && <Overview {...memberProps} />}
              {page === 'vault' && (
                <Vault {...memberProps} query={query} setQuery={setQuery} />
              )}{' '}
              {page === 'care' && <Care {...memberProps} />}{' '}
              {page === 'medication' && <Medication {...memberProps} />}{' '}
              {page === 'deliveries' && <Deliveries {...memberProps} />}{' '}
              {page === 'membership' && <Membership {...memberProps} />}{' '}
              {page === 'family' && <FamilyAccess {...memberProps} />}
            </>
          ) : null}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={14} /> Your care. Your choices. Your Health Vault.
            </span>
            <button onClick={() => setModal({ kind: 'emergency-help' })}>
              Not an emergency service <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === 'reading'
              ? 'Add a reading'
              : modal.kind === 'consult'
                ? 'Make time for your health'
                : modal.kind === 'family'
                  ? 'Bring family into your care'
                  : modal.kind === 'upload'
                    ? 'Add to your Health Vault'
                    : modal.kind === 'plan'
                      ? 'Choose your care plan'
                      : modal.kind === 'emergency'
                        ? 'Your emergency summary'
                        : modal.kind === 'profile'
                          ? 'Your personal details'
                          : modal.kind === 'review'
                            ? 'Review this reading'
                            : modal.kind === 'sign'
                              ? 'Complete and sign consult'
                              : modal.kind === 'accept'
                                ? 'Schedule the consult'
                                : modal.kind === 'verify-document'
                                  ? 'Verify an imported document'
                                  : modal.kind === 'delivery'
                                    ? 'Confirm the delivery'
                                    : modal.kind === 'audit'
                                      ? 'Your record access history'
                                      : modal.kind === 'share'
                                        ? 'Share your emergency summary'
                                        : modal.kind === 'cancel'
                                          ? 'Request membership cancellation'
                                          : modal.kind === 'privacy'
                                            ? 'Request deletion of your data'
                                            : modal.kind === 'account'
                                              ? 'Your account'
                                              : modal.kind === 'notifications'
                                                ? 'Your next steps'
                                                : modal.kind === 'emergency-help'
                                                  ? 'Urgent help'
                                                  : modal.kind === 'order'
                                                    ? 'Prescription journey'
                                                    : modal.kind === 'document'
                                                      ? 'Document details'
                                                      : 'Your care team'
          }
          close={close}
          wide={['emergency', 'audit'].includes(modal.kind)}
        >
          {modal.kind === 'reading' && (
            <ReadingForm
              onSubmit={(body: Data) =>
                act(
                  `/members/${mid}/vitals`,
                  body,
                  'POST',
                  'Reading saved. Your care team can review it.',
                )
              }
            />
          )}
          {modal.kind === 'consult' && (
            <ConsultForm
              home={modal.home}
              onSubmit={(body: Data) =>
                act(
                  `/members/${mid}/consults`,
                  body,
                  'POST',
                  'Sample request saved. No clinician has been contacted.',
                )
              }
            />
          )}
          {modal.kind === 'family' && (
            <Form
              label="Grant family access"
              onSubmit={(f) =>
                act(
                  `/members/${mid}/family`,
                  {
                    name: f.get('name'),
                    email: f.get('email'),
                    scope: f.get('scope'),
                    consultNotes: f.get('consultNotes') === 'on',
                    emergency: f.get('emergency') === 'on',
                  },
                  'POST',
                  'Family access granted. No invitation was sent in this demo.',
                )
              }
            >
              <Field label="Full name">
                <input name="name" required minLength={2} />
              </Field>
              <Field label="Email address">
                <input name="email" type="email" required />
              </Field>
              <Field label="What can they see?">
                <select name="scope">
                  <option value="summary">Summary only</option>
                  <option value="summary_updates">Summary and care updates</option>
                </select>
              </Field>
              <label className="check-row">
                <input name="emergency" type="checkbox" /> Allow access to emergency summary
              </label>
              <label className="check-row">
                <input name="consultNotes" type="checkbox" /> Also allow access to my consult notes
              </label>
              <Notice>
                You can revoke access at any time. Family viewers cannot change your records.
              </Notice>
            </Form>
          )}
          {modal.kind === 'upload' && (
            <Form
              label="Upload for verification"
              onSubmit={async (f) => {
                if (__SHARED_PREVIEW__)
                  throw new Error(
                    'Documents are disabled in the shared review. Please use the locally installed app with sample files.',
                  );
                const file = f.get('file') as File;
                if (file.size > 10 * 1024 * 1024)
                  throw new Error('The file must be smaller than 10 MB.');
                const fileBase64 = await new Promise<string>((resolve, reject) => {
                  const r = new FileReader();
                  r.onload = () => resolve(String(r.result).split(',')[1]);
                  r.onerror = reject;
                  r.readAsDataURL(file);
                });
                await act(
                  `/members/${mid}/documents`,
                  {
                    name: file.name,
                    mime: file.type,
                    fileBase64,
                    type: f.get('type'),
                    documentDate: f.get('documentDate'),
                  },
                  'POST',
                  'Document uploaded. It is awaiting staff verification.',
                );
              }}
            >
              <div className="upload-zone">
                <Upload size={32} />
                <h3>Keep your health story together</h3>
                <p>Scripts, results, reports, and letters.</p>
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  aria-label="Choose document"
                />
                <small>PDF, JPG or PNG · up to 10 MB</small>
              </div>
              <div className="form-grid">
                <Field label="Document type">
                  <select name="type">
                    {[
                      'script',
                      'pathology',
                      'radiology',
                      'discharge',
                      'specialist',
                      'vaccination',
                      'other',
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Document date">
                  <input name="documentDate" type="date" defaultValue={todayKey()} required />
                </Field>
              </div>
              <Notice>
                Staff will verify your document before it is added as a confirmed record. Automatic
                text extraction is not connected in the local version.
              </Notice>
            </Form>
          )}
          {modal.kind === 'plan' && (
            <Form
              label="Save demo membership choice"
              onSubmit={(f) =>
                act(
                  `/members/${mid}/membership`,
                  { tier: f.get('tier'), paymentMethod: f.get('paymentMethod') },
                  'POST',
                  data?.subscription?.status === 'active'
                    ? 'Your plan change is scheduled for the next billing date.'
                    : 'Plan selected. Complete your test payment in Billing.',
                )
              }
            >
              <Notice>{SUBSCRIPTION_NOTICE}</Notice>
              <Field label="Membership">
                <select name="tier" defaultValue={modal.tier || data?.member.tier}>
                  {Object.entries(TIERS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name} · {money(v.amount)} / month
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment method">
                <select
                  name="paymentMethod"
                  defaultValue={data?.subscription?.paymentMethod || 'card'}
                >
                  <option value="card">Card</option>
                  <option value="debit_order">Debit order</option>
                </select>
              </Field>
              <Notice>
                All prices include VAT. Plan changes take effect at the next billing date for active
                members. No card or bank details are collected in this test version.
              </Notice>
            </Form>
          )}
          {modal.kind === 'profile' && (
            <Form
              onSubmit={(f) =>
                act(
                  `/members/${mid}/profile`,
                  {
                    preferredName: f.get('preferredName'),
                    phone: f.get('phone'),
                    medicalAidScheme: f.get('medicalAidScheme'),
                    medicalAidNumber: f.get('medicalAidNumber'),
                    allergies: String(f.get('allergies'))
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                    conditions: String(f.get('conditions'))
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                    nextOfKin: { name: f.get('kinName'), phone: f.get('kinPhone') },
                  },
                  'PATCH',
                )
              }
            >
              <div className="form-grid">
                <Field label="Preferred name">
                  <input name="preferredName" defaultValue={data?.member.preferredName} />
                </Field>
                <Field label="Phone">
                  <input
                    name="phone"
                    defaultValue={data?.member.phone}
                    required
                    pattern="\+27[0-9]{9}"
                  />
                </Field>
                <Field label="Medical aid scheme">
                  <input name="medicalAidScheme" defaultValue={data?.member.medicalAidScheme} />
                </Field>
                <Field label="Membership number">
                  <input name="medicalAidNumber" defaultValue={data?.member.medicalAidNumber} />
                </Field>
                <Field label="Next of kin">
                  <input name="kinName" defaultValue={data?.member.nextOfKin?.name} />
                </Field>
                <Field label="Next of kin phone">
                  <input name="kinPhone" defaultValue={data?.member.nextOfKin?.phone} />
                </Field>
              </div>
              <Field label="Known allergies (comma-separated)">
                <input name="allergies" defaultValue={data?.member.allergies?.join(', ')} />
              </Field>
              <Field label="Conditions (comma-separated)">
                <input name="conditions" defaultValue={data?.member.conditions?.join(', ')} />
              </Field>
            </Form>
          )}
          {modal.kind === 'emergency' && (
            <>
              <EmergencySummary summary={modal.summary} />
              <div className="button-row no-print">
                <Button kind="secondary" onClick={() => window.print()}>
                  <Printer size={16} />
                  Print summary
                </Button>
                {user.role === 'member' && (
                  <Button
                    onClick={async () => {
                      try {
                        const s = await api(`/members/${mid}/emergency-share`, 'POST', {});
                        setModal({ kind: 'share', ...s });
                      } catch (e: any) {
                        notify(e.message);
                      }
                    }}
                  >
                    Create one-time link <ArrowUpRight size={16} />
                  </Button>
                )}
              </div>
            </>
          )}
          {modal.kind === 'share' && (
            <>
              <p>
                Send the link and code separately to the person who needs your summary. It can be
                opened once, within 24 hours.
              </p>
              <Field label="Private summary link">
                <input
                  readOnly
                  value={`${location.origin}/share/${modal.token}`}
                  onFocus={(e) => e.target.select()}
                />
              </Field>
              <div className="share-code">{modal.code}</div>
              <p className="muted">Expires {date(modal.expiresAt, true)}</p>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${location.origin}/share/${modal.token}`);
                    notify('Link copied. Share the code separately.');
                  } catch {
                    notify('Select and copy the link above.');
                  }
                }}
              >
                Copy link
              </Button>
            </>
          )}
          {modal.kind === 'review' && (
            <Form
              label="Record review"
              onSubmit={(f) =>
                act(
                  `/vitals/${modal.item.id}/review`,
                  { note: f.get('note'), escalate: f.get('escalate') === 'on' },
                  'POST',
                  'Review saved.',
                )
              }
            >
              <Notice>
                {titleCase(modal.item.type)}: {modal.item.value}
                {modal.item.secondary ? `/${modal.item.secondary}` : ''} {modal.item.unit}
              </Notice>
              <Field label="Review and call notes">
                <textarea name="note" required rows={5} />
              </Field>
              <label className="check-row">
                <input name="escalate" type="checkbox" /> Escalate to the doctor and create a
                consult request
              </label>
            </Form>
          )}
          {modal.kind === 'accept' && (
            <Form
              label="Confirm appointment"
              onSubmit={(f) =>
                act(
                  `/consults/${modal.item.id}/accept`,
                  { scheduledAt: new Date(String(f.get('scheduledAt'))).toISOString() },
                  'POST',
                  'Sample appointment scheduled. No call has been arranged.',
                )
              }
            >
              <p>{modal.item.reason}</p>
              <Field label="Appointment date and time (your device timezone)">
                <input name="scheduledAt" type="datetime-local" required />
              </Field>
              <Notice>
                This schedules a fictional appointment only. Live video and messaging are not
                connected; no care team is contacted.
              </Notice>
            </Form>
          )}
          {modal.kind === 'sign' && (
            <Form
              label="Sign and lock consult note"
              onSubmit={(f) =>
                act(
                  `/consults/${modal.item.id}/sign`,
                  { note: f.get('note') },
                  'POST',
                  'Consult signed. The note is now locked.',
                )
              }
            >
              <p>{modal.item.reason}</p>
              <Field label="Clinical note">
                <textarea name="note" required rows={7} />
              </Field>
              <Notice>
                Signing locks this note. A completed home visit makes its R 1,850 invoice payable.
              </Notice>
            </Form>
          )}
          {modal.kind === 'verify-document' && (
            <Form
              label="Verify document"
              onSubmit={(f) =>
                act(
                  `/documents/${modal.item.id}/verify`,
                  {
                    extractedText: f.get('extractedText'),
                    tags: String(f.get('tags'))
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    documentDate: f.get('documentDate'),
                  },
                  'POST',
                  'Document verified.',
                )
              }
            >
              <p>
                <strong>{modal.item.name}</strong>
              </p>
              {modal.item.hasFile && (
                <a
                  className="text-link"
                  href={`/api/documents/${modal.item.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download source for review <ArrowDownToLine size={16} />
                </a>
              )}
              <Field label="Verified text">
                <textarea name="extractedText" defaultValue={modal.item.extractedText} rows={6} />
              </Field>
              <Field label="Document date">
                <input
                  name="documentDate"
                  type="date"
                  defaultValue={modal.item.documentDate}
                  required
                />
              </Field>
              <Field label="Tags (comma-separated)">
                <input name="tags" defaultValue={modal.item.tags?.join(', ')} />
              </Field>
              <Notice>
                Medication reconciliation is a separate clinician task. Verifying this document does
                not prescribe medication.
              </Notice>
            </Form>
          )}
          {modal.kind === 'delivery' && (
            <Form
              label="Record demo delivery"
              onSubmit={(f) =>
                act(
                  `/orders/${modal.item.id}/advance`,
                  {
                    status: 'delivered',
                    recipientName: f.get('recipientName'),
                    idChecked: f.get('idChecked') === 'on',
                    ...(f.get('temperature') ? { temperature: Number(f.get('temperature')) } : {}),
                    proofNote: f.get('proofNote'),
                  },
                  'POST',
                  'Demo delivery recorded. Medication timeline updated.',
                )
              }
            >
              <Field label="Recipient name">
                <input name="recipientName" required minLength={2} />
              </Field>
              {modal.item.requiresId && (
                <label className="check-row">
                  <input name="idChecked" type="checkbox" required /> Recipient ID checked
                </label>
              )}
              {modal.item.requiresTemperature && (
                <Field label="Cold-chain temperature (°C)">
                  <input name="temperature" type="number" step="0.1" required />
                </Field>
              )}
              <Field label="Delivery note">
                <textarea name="proofNote" rows={3} />
              </Field>
              <Notice>
                This demonstration records recipient confirmation only. Signature, photo capture and
                offline proof sync are required before live deliveries.
              </Notice>
            </Form>
          )}
          {modal.kind === 'cancel' && (
            <Form
              label="Request cancellation"
              onSubmit={async () => {
                const r = await api(`/members/${mid}/cancel-membership`, 'POST', {});
                await load();
                close();
                notify(`Cancellation requested. Effective ${date(r.effectiveAt)}.`);
              }}
            >
              <p>
                Your membership is month-to-month with 20 business days’ notice. We’ll record the
                effective date when you submit.
              </p>
              <label className="check-row">
                <input type="checkbox" required /> I would like to cancel my membership.
              </label>
            </Form>
          )}
          {modal.kind === 'privacy' && (
            <Form
              label="Record deletion request"
              onSubmit={(f) =>
                act(
                  `/members/${mid}/privacy-request`,
                  { reason: f.get('reason') },
                  'POST',
                  'Deletion request recorded for review. Records have not yet been deleted.',
                )
              }
            >
              <p>
                Your request is reviewed by the information officer, including any clinical
                record-retention requirements.
              </p>
              <Field label="Request details">
                <textarea name="reason" required rows={4} />
              </Field>
            </Form>
          )}
          {modal.kind === 'account' && (
            <>
              <div className="account-summary">
                <Avatar name={user.name} />
                <div>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <Badge>{titleCase(user.role)}</Badge>
                </div>
              </div>
              <Button
                kind="secondary"
                onClick={async () => {
                  await api('/auth/logout', 'POST', {});
                  setUser(null);
                  setData(null);
                  close();
                }}
              >
                <LogOut size={16} />
                Sign out
              </Button>
            </>
          )}
          {modal.kind === 'support' && (
            <>
              <div className="care-person">
                <Avatar name="Thandi Mkhize" />
                <div>
                  <h3>{data?.member?.coordinator || 'Your care coordinator'}</h3>
                  <p>Weekdays, 08:00–17:00</p>
                </div>
              </div>
              <Notice>
                The local demo does not send calls or messages. Your practice contact details will
                appear here when configured.
              </Notice>
              <Button
                onClick={() => setModal({ kind: 'consult' })}
                disabled={!mid || user.role !== 'member'}
              >
                Request a consult <ArrowRight size={16} />
              </Button>
            </>
          )}
          {modal.kind === 'notifications' && (
            <div className="reminder-list">
              {data?.reminders?.length ? (
                data.reminders.map((r: Data) => (
                  <div key={r.id} className="reminder-row">
                    <span className="soft-icon">
                      <Bell size={19} />
                    </span>
                    <div>
                      <strong>{r.title}</strong>
                      <p>{r.time} · Daily</p>
                    </div>
                    <Badge tone={isToday(r.acknowledgedAt) ? 'green' : 'sand'}>
                      {isToday(r.acknowledgedAt) ? 'Done' : 'Upcoming'}
                    </Badge>
                  </div>
                ))
              ) : (
                <Empty title="You’re all caught up">No reminders to show in this view.</Empty>
              )}
            </div>
          )}
          {modal.kind === 'emergency-help' && (
            <>
              <Notice kind="error">
                Proactive Wellness is not an emergency service. Do not wait for a consult or an app
                response in an emergency.
              </Notice>
              <div className="emergency-numbers">
                <a href="tel:112">
                  112 <span>Emergency from a cellphone</span>
                  <Phone />
                </a>
                <a href="tel:10177">
                  10177 <span>Ambulance</span>
                  <Phone />
                </a>
              </div>
              <p>Also contact your nominated private emergency service, if applicable.</p>
            </>
          )}
          {modal.kind === 'document' && (
            <>
              <div className="doc-detail">
                <FileText size={35} />
                <h3>{modal.item.name}</h3>
                <Badge tone={modal.item.status === 'verified' ? 'green' : 'sand'}>
                  {titleCase(modal.item.status)}
                </Badge>
              </div>
              <p className="muted">
                {titleCase(modal.item.type)} · {modal.item.documentDate}
              </p>
              <p>{modal.item.extractedText || 'Awaiting verification by your care team.'}</p>
              {modal.item.hasFile ? (
                <a className="button primary" href={`/api/documents/${modal.item.id}/file`}>
                  <ArrowDownToLine size={16} />
                  Download original
                </a>
              ) : (
                <Notice>This fictional example has no attached file.</Notice>
              )}
            </>
          )}
          {modal.kind === 'audit' && <AuditTable rows={modal.rows} />}
          {modal.kind === 'order' && <OrderTimeline order={modal.item} />}
        </Modal>
      )}
    </div>
  );
}

function ReadingForm({ onSubmit }: any) {
  const [type, setType] = useState('blood_pressure');
  const units: Data = {
    blood_pressure: 'mmHg',
    glucose: 'mmol/L',
    heart_rate: 'bpm',
    weight: 'kg',
    spo2: '%',
    temperature: '°C',
  };
  return (
    <Form
      label="Save my reading"
      onSubmit={(f) =>
        onSubmit({
          type,
          value: Number(f.get('value')),
          ...(type === 'blood_pressure' ? { secondary: Number(f.get('secondary')) } : {}),
          takenAt: new Date().toISOString(),
          source: 'manual',
        })
      }
    >
      <p className="muted">A small check-in helps your care team see the bigger picture.</p>
      <Field label="What are you recording?">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.keys(units).map((k) => (
            <option value={k} key={k}>
              {titleCase(k)}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field
          label={`${type === 'blood_pressure' ? 'Systolic' : titleCase(type)} (${units[type]})`}
        >
          <input
            name="value"
            type="number"
            required
            step={['glucose', 'weight', 'temperature'].includes(type) ? '.1' : '1'}
            min={['glucose', 'weight', 'temperature'].includes(type) ? '0.1' : '1'}
            max="600"
            placeholder={type === 'blood_pressure' ? 'e.g. 120' : ''}
          />
        </Field>
        {type === 'blood_pressure' && (
          <Field label="Diastolic (mmHg)">
            <input
              name="secondary"
              type="number"
              required
              min="1"
              max="250"
              placeholder="e.g. 80"
            />
          </Field>
        )}
      </div>
      <Notice>
        Sample thresholds demonstrate flags and review queues. No staffed monitoring or response is
        provided. The app does not diagnose or suggest treatment.
      </Notice>
    </Form>
  );
}
function ConsultForm({ onSubmit, home = false }: any) {
  const [mode, setMode] = useState(home ? 'home' : 'virtual');
  return (
    <Form
      label={mode === 'home' ? 'Save sample home-visit request' : 'Save sample consult request'}
      onSubmit={(f) =>
        onSubmit({
          reason: f.get('reason'),
          urgency: f.get('urgency'),
          mode,
          preferredDate: f.get('preferredDate'),
          feeAccepted: f.get('feeAccepted') === 'on',
        })
      }
    >
      <div className="segmented">
        <button
          type="button"
          className={mode === 'virtual' ? 'selected' : ''}
          onClick={() => setMode('virtual')}
        >
          <Video size={17} /> Virtual consult
        </button>
        <button
          type="button"
          className={mode === 'home' ? 'selected' : ''}
          onClick={() => setMode('home')}
        >
          <Home size={17} /> Home visit
        </button>
      </div>
      <Field label="How can we help?">
        <textarea
          name="reason"
          rows={4}
          required
          placeholder="Tell your care team what you would like to discuss."
        />
      </Field>
      <div className="form-grid">
        <Field label="Preferred date">
          <input name="preferredDate" type="date" min={todayKey()} />
        </Field>
        <Field label="Timing">
          <select name="urgency">
            <option value="routine">Routine check-in</option>
            <option value="soon">As soon as available</option>
          </select>
        </Field>
      </div>
      {mode === 'home' ? (
        <label className="check-row fee-check">
          <input type="checkbox" name="feeAccepted" required />
          <span>
            I accept the <strong>R 1,850</strong> home visit fee, invoiced on booking and charged
            after completion.
          </span>
        </label>
      ) : (
        <p className="inline-note">
          <CheckCircle2 size={16} /> Planned: virtual consults included at launch. This is a sample
          request.
        </p>
      )}
      <Notice>
        Intended service hours: weekdays, 08:00–17:00. Demo requests receive no clinical response.
        For emergencies, call 112 or 10177.
      </Notice>
    </Form>
  );
}

function Overview({ data, go, open, act, notify }: any) {
  const m = data.member,
    next = data.consults
      ?.filter((c: Data) => c.status === 'scheduled')
      .sort((a: Data, b: Data) => a.scheduledAt.localeCompare(b.scheduledAt))[0],
    order = data.orders?.find((o: Data) => o.status !== 'delivered');
  return (
    <>
      <SectionTitle
        eyebrow="A LITTLE CARE, EVERY DAY"
        title={`Hello, ${m.preferredName || m.name.split(' ')[0]}.`}
        description="Let’s take good care of you today."
        action={
          <Button onClick={() => open('consult')}>
            <Plus size={17} />
            Request a consult
          </Button>
        }
      />
      <div className="overview-grid">
        <div className="main-column">
          <section className="welcome-card">
            <div className="welcome-content">
              <Badge tone="light">
                <span className="tiny-dot" /> YOUR CARE, CONNECTED
              </Badge>
              <h2>
                Wellbeing is a journey.
                <br />
                <em>We’re with you.</em>
              </h2>
              <p>
                Your readings, your care team, your next steps.
                <br />
                Everything you need to feel a little more in control.
              </p>
              <Button kind="light" onClick={() => open('reading')}>
                <Plus size={17} />
                Add today’s reading <ArrowUpRight size={17} />
              </Button>
            </div>
            <div className="wellness-art" aria-hidden="true">
              <div className="art-orbit first" />
              <div className="art-orbit second" />
              <div className="art-orbit third" />
              <div className="art-heart">
                <HeartPulse size={74} strokeWidth={1} />
              </div>
              <span className="art-leaf leaf-a" />
              <span className="art-leaf leaf-b" />
              <span className="art-chip">
                <Check size={14} /> A little better, together
              </span>
              <span className="art-star">
                <Sparkles size={22} />
              </span>
            </div>
          </section>
          <section>
            <div className="section-line">
              <h2>Your health at a glance</h2>
              <button className="text-link" onClick={() => go('vault')}>
                View all readings <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="vital-cards">
              {[
                ['blood_pressure', 'Blood pressure', HeartPulse, 'sage'],
                ['glucose', 'Blood glucose', Droplets, 'peach'],
                ['heart_rate', 'Heart rate', Activity, 'lavender'],
              ].map(([type, label, Icon, tone]: any) => {
                const v = latest(data, type);
                return (
                  <article className="vital-card" key={type}>
                    <div className="vital-head">
                      <span className={`soft-icon ${tone}`}>
                        <Icon size={19} />
                      </span>
                      <span>{label}</span>
                    </div>
                    <div className="vital-number">
                      {v ? `${v.value}${v.secondary ? `/${v.secondary}` : ''}` : '—'}
                      <small>{v?.unit || ''}</small>
                    </div>
                    <div className="vital-bottom">
                      <span
                        className={`reading-state ${v?.flagged && !v.reviewedAt ? 'amber' : ''}`}
                      >
                        <span />
                        {v
                          ? v.flagged && !v.reviewedAt
                            ? 'For review'
                            : 'Recorded'
                          : 'No reading yet'}
                      </span>
                      <small>
                        {v ? (isToday(v.takenAt) ? 'Today' : date(v.takenAt)) : 'Add your first'}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <Trend data={data} />
          <section className="panel today-plan">
            <div className="section-line">
              <h2>A little routine. A big difference.</h2>
              <span className="muted small-text">TODAY’S PLAN</span>
            </div>
            {data.reminders?.length ? (
              data.reminders.map((r: Data) => (
                <div className="plan-row" key={r.id}>
                  <button
                    className={`check-circle ${isToday(r.acknowledgedAt) ? 'checked' : ''}`}
                    aria-label={`Mark ${r.title} done`}
                    disabled={isToday(r.acknowledgedAt)}
                    onClick={() =>
                      act(
                        `/reminders/${r.id}/acknowledge`,
                        {},
                        'POST',
                        'Reminder marked done.',
                      ).catch((e: any) => notify(e.message))
                    }
                  >
                    {isToday(r.acknowledgedAt) && <Check size={16} />}
                  </button>
                  <div>
                    <strong>{r.title}</strong>
                    <p>
                      {r.type === 'reading'
                        ? 'Take a quiet moment and record your reading.'
                        : 'Follow the instructions from your care team.'}
                    </p>
                  </div>
                  <span className="time-tag">
                    <Clock3 size={13} />
                    {r.time}
                  </span>
                  {r.type === 'reading' && (
                    <button className="text-link" onClick={() => open('reading')}>
                      Add reading
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <Empty title="Room for a healthy routine">
                Your care team will add reminders here.
              </Empty>
            )}
          </section>
        </div>
        <aside className="right-column">
          <section className="panel care-team">
            <div className="section-line">
              <h2>Your care team</h2>
              <Heart size={17} />
            </div>
            <p className="muted small-text">Familiar faces. Personal care.</p>
            <div className="care-person">
              <Avatar name={m.doctor?.name || 'Your doctor'} kind="peach" />
              <div>
                <strong>{m.doctor?.name || 'Doctor to be assigned'}</strong>
                <p>Your dedicated doctor</p>
              </div>
            </div>
            <div className="care-person">
              <Avatar name={m.coordinator} kind="sage" />
              <div>
                <strong>{m.coordinator}</strong>
                <p>Nurse & care coordinator</p>
              </div>
            </div>
            <div className="team-hours">
              <span className="tiny-dot" />
              Weekdays · 08:00–17:00
            </div>
            <Button kind="secondary" onClick={() => open('support')}>
              Connect with your team <ArrowUpRight size={15} />
            </Button>
          </section>
          <section className="appointment-card">
            <span className="eyebrow">COMING UP NEXT</span>
            {next ? (
              <>
                <div className="appointment-top">
                  <span className="appointment-date">
                    <b>{new Date(next.scheduledAt).getDate()}</b>
                    <span>
                      {new Intl.DateTimeFormat('en-ZA', { month: 'short' }).format(
                        new Date(next.scheduledAt),
                      )}
                    </span>
                  </span>
                  <span className="soft-icon">
                    <Video size={22} />
                  </span>
                </div>
                <h3>{next.reason}</h3>
                <p>{date(next.scheduledAt, true)} · Simulated video appointment</p>
                <div className="appointment-doctor">
                  <Avatar small name={next.doctorName} />
                  <span>{next.doctorName}</span>
                </div>
                <button className="text-link" onClick={() => go('care')}>
                  View appointment <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <>
                <CalendarDays size={34} />
                <h3>A moment for you</h3>
                <p>Book a check-in when you need one.</p>
                <button className="text-link" onClick={() => open('consult')}>
                  Request a consult <ArrowRight size={15} />
                </button>
              </>
            )}
          </section>
          <section className="panel delivery-small">
            <div className="section-line">
              <span className="soft-icon peach">
                <Package size={21} />
              </span>
              <Badge tone="sand">{order ? titleCase(order.status) : 'All up to date'}</Badge>
            </div>
            <h3>Your care, to your door.</h3>
            <p>
              {order
                ? 'Fictional order progress demonstrates the intended pharmacy workflow.'
                : 'Sample prescription deliveries will appear here.'}
            </p>
            {order && (
              <>
                <div className="delivery-mini-progress">
                  <span className="done" />
                  <span
                    className={
                      ['ready', 'collected', 'delivered'].includes(order.status) ? 'done' : ''
                    }
                  />
                  <span
                    className={['collected', 'delivered'].includes(order.status) ? 'done' : ''}
                  />
                  <span className={order.status === 'delivered' ? 'done' : ''} />
                </div>
                <button className="text-link" onClick={() => go('deliveries')}>
                  Track your delivery <ArrowRight size={15} />
                </button>
              </>
            )}
          </section>
          <div className="membership-mini">
            <ShieldCheck size={25} />
            <div>
              <strong>{TIERS[m.tier as Tier]?.name} membership</strong>
              <p>
                {data.subscription?.status === 'active'
                  ? 'A little peace of mind, every month.'
                  : 'Record a test payment to activate the demo only.'}
              </p>
            </div>
            <button aria-label="View membership" onClick={() => go('membership')}>
              <ChevronRight size={18} />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

function Trend({ data }: any) {
  const [period, setPeriod] = useState(7);
  const readings = (data.vitals || [])
    .filter(
      (v: Data) =>
        v.type === 'blood_pressure' && Date.parse(v.takenAt) > Date.now() - period * 86400000,
    )
    .sort((a: Data, b: Data) => a.takenAt.localeCompare(b.takenAt));
  const width = 640,
    height = 165,
    left = 38,
    right = 20,
    top = 15,
    bottom = 30,
    min = 50,
    max = 180;
  const x = (i: number) => left + (i * (width - left - right)) / Math.max(1, readings.length - 1),
    y = (value: number) => top + ((max - value) / (max - min)) * (height - top - bottom);
  return (
    <section className="panel trend-panel">
      <div className="section-line">
        <div>
          <h2>The bigger picture</h2>
          <p className="muted small-text">Your blood pressure over time</p>
        </div>
        <select
          aria-label="Chart period"
          className="compact-select"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      {readings.length ? (
        <>
          <div className="chart-legend">
            <span>
              <i className="legend-dot systolic" />
              Systolic
            </span>
            <span>
              <i className="legend-dot diastolic" />
              Diastolic
            </span>
            <small>mmHg</small>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="trend-chart"
            role="img"
            aria-label={`Blood pressure chart with ${readings.length} readings. Latest: ${readings.at(-1).value} over ${readings.at(-1).secondary} millimetres of mercury.`}
          >
            {[60, 90, 120, 150, 180].map((n) => (
              <g key={n}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(n)}
                  y2={y(n)}
                  stroke="#e9eee7"
                  strokeDasharray="3 5"
                />
                <text x="0" y={y(n) + 4} fill="#7e8981" fontSize="10">
                  {n}
                </text>
              </g>
            ))}
            {['value', 'secondary'].map((key, j) => (
              <g key={key}>
                <polyline
                  points={readings.map((v: Data, i: number) => `${x(i)},${y(v[key])}`).join(' ')}
                  fill="none"
                  stroke={j ? 'var(--chart-secondary, #a8bd8a)' : 'var(--green, #346b53)'}
                  strokeWidth={j ? 2 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {readings.map((v: Data, i: number) => (
                  <circle
                    key={v.id}
                    cx={x(i)}
                    cy={y(v[key])}
                    r={3}
                    fill={j ? 'var(--chart-secondary, #a8bd8a)' : 'var(--green, #346b53)'}
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <title>
                      {date(v.takenAt)}: {v.value}/{v.secondary} mmHg
                    </title>
                  </circle>
                ))}
              </g>
            ))}
            {readings
              .filter(
                (_: any, i: number) =>
                  i === 0 || i === readings.length - 1 || i % Math.ceil(readings.length / 6) === 0,
              )
              .map((v: Data) => (
                <text
                  key={v.id}
                  x={x(readings.indexOf(v))}
                  y={height - 5}
                  textAnchor="middle"
                  fill="#7e8981"
                  fontSize="10"
                >
                  {date(v.takenAt)}
                </text>
              ))}
          </svg>
          <div className="chart-note">
            <span className="soft-icon small">
              <HeartPulse size={14} />
            </span>
            Every reading helps your team understand your personal pattern.
          </div>
        </>
      ) : (
        <Empty title="Your story starts with a reading">
          Add your first blood pressure reading to see your trend.
        </Empty>
      )}
    </section>
  );
}

function Vault({ data, query, setQuery, open, emergency, notify }: any) {
  const [tab, setTab] = useState('timeline');
  const documents = (data.documents || []).filter((d: Data) =>
    `${d.name} ${d.type}`.toLowerCase().includes(query.toLowerCase()),
  );
  const items = [
    ...documents.map((d: Data) => ({
      ...d,
      event: 'document',
      time: d.documentDate,
      title: d.name,
      description: titleCase(d.type),
      icon: FileText,
    })),
    ...(data.consults || [])
      .filter((c: Data) => c.status === 'completed')
      .map((c: Data) => ({
        ...c,
        event: 'consult',
        time: c.signedAt || c.scheduledAt,
        title: c.reason,
        description: c.doctorName,
        icon: Stethoscope,
      })),
    ...(data.medications || []).map((m: Data) => ({
      ...m,
      event: 'medication',
      time: m.dispensedAt,
      title: `${m.drug} ${m.strength}`,
      description: `Dispensed by ${m.pharmacy}`,
      icon: Pill,
    })),
  ]
    .filter((x) => `${x.title} ${x.description}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.time.localeCompare(a.time));
  return (
    <>
      <SectionTitle
        eyebrow="YOUR LIFELONG HEALTH STORY"
        title="Health Vault"
        description="One place for every chapter of your care."
        action={
          <Button onClick={() => open('upload')}>
            <Upload size={17} />
            Add a document
          </Button>
        }
      />
      <div className="vault-banner">
        <div>
          <span className="soft-icon">
            <FolderHeart size={25} />
          </span>
          <div>
            <h3>Your history, always with you.</h3>
            <p>Records from your care team and documents you bring from elsewhere.</p>
          </div>
        </div>
        <Button kind="secondary" onClick={emergency}>
          <ShieldCheck size={17} />
          Emergency summary
        </Button>
      </div>
      <div className="profile-strip">
        <div>
          <small>KNOWN CONDITIONS</small>
          <p>{data.member.conditions?.join(', ') || 'None recorded'}</p>
        </div>
        <div>
          <small>ALLERGIES</small>
          <p className="allergy-text">{data.member.allergies?.join(', ') || 'None recorded'}</p>
        </div>
        <div>
          <small>MEDICAL AID</small>
          <p>{data.member.medicalAidScheme || 'Not provided'}</p>
        </div>
        <button className="text-link" onClick={() => open('profile')}>
          Edit details <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {[
            ['timeline', 'Timeline'],
            ['documents', 'Documents'],
            ['readings', 'Readings'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={tab === k ? 'active' : ''}>
              {l}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={17} />
          <input
            className="search-input"
            placeholder="Search your records"
            aria-label="Search your records"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {tab === 'timeline' ? (
        <section className="panel timeline">
          {items.length ? (
            items.map((item) => (
              <div key={item.id} className="timeline-row">
                <span className="timeline-marker">
                  <item.icon size={20} />
                </span>
                <div>
                  <small>{date(item.time)}</small>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.event === 'consult' && (
                    <p className="consult-note">
                      {item.note}
                      <LockKeyhole size={12} />
                    </p>
                  )}
                </div>
                {item.event === 'document' ? (
                  <button className="text-link" onClick={() => open('document', { item })}>
                    View
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <Badge tone="gray">
                    {item.event === 'consult' ? 'Signed record' : titleCase(item.status)}
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <Empty
              title="A fresh start for your health story"
              action={
                <Button kind="secondary" onClick={() => open('upload')}>
                  Add your first document
                </Button>
              }
            >
              Your consults, results and medication history will appear here.
            </Empty>
          )}
        </section>
      ) : tab === 'documents' ? (
        <div className="document-grid">
          {documents.length ? (
            documents.map((d: Data) => (
              <button
                className="document-card"
                key={d.id}
                onClick={() => open('document', { item: d })}
              >
                <span className="soft-icon">
                  <FileText size={24} />
                </span>
                <Badge tone={d.status === 'verified' ? 'green' : 'sand'}>
                  {d.status === 'verified' ? 'Verified' : 'Awaiting review'}
                </Badge>
                <h3>{d.name}</h3>
                <p>
                  {date(d.documentDate)} · {titleCase(d.type)}
                </p>
                <span className="text-link">
                  Open record <ArrowUpRight size={15} />
                </span>
              </button>
            ))
          ) : (
            <Empty title="No documents yet">
              Upload a script, report or result to get started.
            </Empty>
          )}
        </div>
      ) : (
        <>
          <Trend data={data} />
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reading</th>
                  <th>Value</th>
                  <th>Recorded</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {(data.vitals || [])
                  .slice()
                  .sort((a: Data, b: Data) => b.takenAt.localeCompare(a.takenAt))
                  .map((v: Data) => (
                    <tr key={v.id}>
                      <td>{titleCase(v.type)}</td>
                      <td>
                        <strong>
                          {v.value}
                          {v.secondary ? `/${v.secondary}` : ''}
                        </strong>{' '}
                        {v.unit}
                      </td>
                      <td>{date(v.takenAt, true)}</td>
                      <td>
                        <Badge tone={v.flagged && !v.reviewedAt ? 'sand' : 'gray'}>
                          {v.reviewedAt ? 'Reviewed' : v.flagged ? 'For review' : 'Recorded'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      <div className="vault-actions">
        <a className="text-link" href={`/api/members/${data.member.id}/export`}>
          <ArrowDownToLine size={16} />
          Export my Health Vault
        </a>
        <button
          className="text-link"
          onClick={async () => {
            try {
              open('audit', { rows: await api(`/audit/${data.member.id}`) });
            } catch (e: any) {
              notify(e.message);
            }
          }}
        >
          <Eye size={16} />
          See who accessed my record
        </button>
      </div>
    </>
  );
}
function Care({ data, open }: any) {
  return (
    <>
      <SectionTitle
        eyebrow="TIME WITH YOUR CARE TEAM"
        title="My care"
        description="A conversation can make all the difference."
        action={
          <Button onClick={() => open('consult')}>
            <Plus size={17} />
            Request a consult
          </Button>
        }
      />
      <div className="care-options">
        <div className="panel">
          <span className="soft-icon sage">
            <Video size={24} />
          </span>
          <h2>A familiar face, wherever you are.</h2>
          <p>
            Planned: unlimited virtual consultations in every membership. This demo records requests
            only; no live consultation is provided.
          </p>
          <button className="text-link" onClick={() => open('consult')}>
            Simulate consult request <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="panel">
          <span className="soft-icon peach">
            <Home size={24} />
          </span>
          <h2>Good care, in the comfort of home.</h2>
          <p>
            Planned: home visits at R 1,850 per completed visit on every tier. Demo requests do not
            book a real visit or collect funds.
          </p>
          <button className="text-link" onClick={() => open('consult', { home: true })}>
            Simulate home-visit request <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      <div className="section-line">
        <h2>Your appointments</h2>
        <span className="muted">{data.consults.length} in your care history</span>
      </div>
      <div className="consult-list">
        {data.consults.length ? (
          data.consults.map((c: Data) => (
            <article className="panel consult-card" key={c.id}>
              <span className={`soft-icon ${c.mode === 'home' ? 'peach' : 'sage'}`}>
                {c.mode === 'home' ? <Home size={23} /> : <Video size={23} />}
              </span>
              <div>
                <div className="consult-title">
                  <h3>{c.reason}</h3>
                  <Badge
                    tone={
                      c.status === 'requested'
                        ? 'sand'
                        : c.status === 'completed'
                          ? 'gray'
                          : 'green'
                    }
                  >
                    {titleCase(c.status)}
                  </Badge>
                </div>
                <p>
                  {c.doctorName || 'Care team will confirm'} ·{' '}
                  {c.mode === 'home' ? 'Home visit' : 'Virtual consult'}
                </p>
                <span className="inline-note">
                  <CalendarDays size={14} />
                  {date(c.scheduledAt, true)}
                </span>
                {c.signedAt && (
                  <div className="consult-note">
                    <LockKeyhole size={13} /> {c.note}
                  </div>
                )}
                {c.status === 'scheduled' && (
                  <p className="small-text muted">
                    Fictional appointment only. No WhatsApp call or live consultation is arranged.
                  </p>
                )}
              </div>
            </article>
          ))
        ) : (
          <Empty title="Make space for your wellbeing">
            Your requested and completed consults will appear here.
          </Empty>
        )}
      </div>
    </>
  );
}
function Medication({ data }: any) {
  return (
    <>
      <SectionTitle
        eyebrow="PART OF YOUR EVERYDAY ROUTINE"
        title="My medication"
        description="Your dispensing history, in one reassuring place."
      />
      <Notice>
        Follow your current prescription and pharmacy label. Contact your care team about any
        changes or questions.
      </Notice>
      <div className="section-line">
        <h2>Current medication</h2>
        <Badge>{data.medications.filter((m: Data) => m.status === 'current').length} current</Badge>
      </div>
      <div className="medication-grid">
        {data.medications
          .filter((m: Data) => m.status === 'current')
          .map((m: Data) => (
            <article className="panel medication-card" key={m.id}>
              <span className="soft-icon sage">
                <Pill size={26} />
              </span>
              <div>
                <h2>
                  {m.drug} <span>{m.strength}</span>
                </h2>
                <p>{m.directions}</p>
                <div className="med-details">
                  <span>
                    Quantity <strong>{m.quantity}</strong>
                  </span>
                  <span>
                    Dispensed <strong>{date(m.dispensedAt)}</strong>
                  </span>
                </div>
                <p className="small-text muted">
                  {m.pharmacy} · {m.prescriber || 'Care team prescription'}
                </p>
              </div>
            </article>
          ))}
      </div>
      {!data.medications.length && (
        <Empty icon={Pill} title="Your medication history starts here">
          Dispensed medication is added to your timeline by the care team.
        </Empty>
      )}
      <div className="section-line">
        <h2>Medication timeline</h2>
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Medication</th>
              <th>Date</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.medications.map((m: Data) => (
              <tr key={m.id}>
                <td>
                  {m.drug} · {m.strength}
                </td>
                <td>{date(m.dispensedAt)}</td>
                <td>{m.pharmacy}</td>
                <td>
                  <Badge>{titleCase(m.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function OrderTimeline({ order }: any) {
  const steps = [
    ['sent', 'Prescription received', 'Your prescription has reached the pharmacy.'],
    ['dispensing', 'Being prepared', 'The pharmacy is preparing your medication.'],
    ['ready', 'Ready for collection', 'Your prescription is ready for the driver.'],
    ['collected', 'On the way', 'Collected by your delivery driver.'],
    ['delivered', 'Delivered with care', 'Your delivery has been received.'],
  ];
  const current = steps.findIndex((s) => s[0] === order.status);
  return (
    <div className="order-timeline">
      {steps.map(([k, title, desc], i) => {
        const event = order.events?.find((e: Data) => e.status === k);
        return (
          <div
            key={k}
            className={`order-step ${i <= current ? 'complete' : ''} ${i === current ? 'current' : ''}`}
          >
            <span>{i < current ? <Check size={16} /> : i + 1}</span>
            <div>
              <h4>{title}</h4>
              <p>{desc}</p>
              {event && <small>{date(event.at, true)}</small>}
            </div>
            {i === current && <Badge>Current step</Badge>}
          </div>
        );
      })}
      {order.status === 'failed' && (
        <Notice kind="error">
          Delivery needs attention. Your care coordinator will arrange the next step.
        </Notice>
      )}
    </div>
  );
}
function Deliveries({ data }: any) {
  return (
    <>
      <SectionTitle
        eyebrow="PRESCRIPTION TO DOOR"
        title="Your medication, delivered."
        description="Simulated delivery tracking. No prescription is issued, dispensed or dispatched."
      />
      <div className="delivery-info">
        <span>
          <MapPin size={17} />
          Within 20 km of Durban
        </span>
        <span>
          <Clock3 size={17} />
          Weekdays · 08:00–17:00
        </span>
      </div>
      {data.orders.length ? (
        data.orders.map((o: Data) => (
          <article className="panel delivery-card" key={o.id}>
            <div className="section-line">
              <div>
                <span className="eyebrow">{o.pharmacy}</span>
                <h2>{o.description || 'Prescription delivery'}</h2>
              </div>
              <Badge tone={o.status === 'delivered' ? 'green' : 'sand'}>
                {titleCase(o.status)}
              </Badge>
            </div>
            <div className="delivery-layout">
              <OrderTimeline order={o} />
              <aside className="delivery-address">
                <div className="delivery-illustration">
                  <Truck size={70} strokeWidth={1} />
                  <span className="road-line" />
                </div>
                <h4>Delivering to</h4>
                <p>{data.member.name}</p>
                <p>{o.address}</p>
                <hr />
                <span className="inline-note">
                  <ShieldCheck size={17} />
                  Personal information shared only as needed for delivery.
                </span>
              </aside>
            </div>
          </article>
        ))
      ) : (
        <Empty icon={Truck} title="Your next delivery starts here">
          Once your doctor issues a prescription, you’ll be able to follow its progress.
        </Empty>
      )}
    </>
  );
}
function Membership({ data, open, act, notify }: any) {
  const s = data.subscription;
  return (
    <>
      <SectionTitle
        eyebrow="CARE THAT FITS YOUR LIFE"
        title="Your membership"
        description="Explore the intended commercial offering and demonstration billing."
      />
      {s && (
        <div className="membership-current">
          <div>
            <Badge tone="light">{titleCase(s.status)}</Badge>
            <h2>{TIERS[s.tier as Tier]?.name}</h2>
            <p>
              {s.nextBillingAt
                ? `Next billing date: ${date(s.nextBillingAt)}`
                : 'A test payment activates only the demo membership.'}
              {s.pendingTier &&
                ` · ${TIERS[s.pendingTier as Tier].name} starts at your next billing date.`}
            </p>
            {s.cancelledAt && <p>Cancellation effective {date(s.cancelledAt)}</p>}
          </div>
          <div className="membership-price">
            {money(s.amount)}
            <small>/ month, including VAT</small>
          </div>
        </div>
      )}
      <Notice>{SUBSCRIPTION_NOTICE}</Notice>
      <div className="pricing-grid">
        {Object.entries(TIERS).map(([k, t]) => (
          <article key={k} className={`pricing-card ${k === 'monitor' ? 'featured' : ''}`}>
            <div className="section-line">
              <h3>{t.name}</h3>
              {k === data.member.tier && <Badge>DEMO PLAN</Badge>}
            </div>
            <p>{t.description}</p>
            <div className="price">
              {money(t.amount)}
              <small>/ month</small>
            </div>
            <ul>
              {t.benefits.map((b) => (
                <li key={b}>
                  <Check size={16} />
                  {b}
                </li>
              ))}
            </ul>
            <Button
              kind={k === 'monitor' ? 'primary' : 'secondary'}
              onClick={() => open('plan', { tier: k })}
            >
              {k === data.member.tier ? 'Manage demo plan' : `Preview ${t.name}`}
              <ArrowRight size={16} />
            </Button>
          </article>
        ))}
      </div>
      <div className="billing-terms">
        <span>
          <Home size={19} />
          <strong>Home visits: R 1,850</strong> per completed visit, on every tier.
        </span>
        <p>
          Intended terms: medication, pathology, radiology and specialist fees are separate or may
          be claimed from medical aid, subject to scheme approval. Claims are not processed here.
          Monthly in advance. Cancel on 20 business days’ notice. All prices include 15% VAT.
        </p>
      </div>
      <div className="section-line">
        <h2>Billing history</h2>
        <Badge tone="sand">Test payments only</Badge>
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((inv: Data) => (
              <tr key={inv.id}>
                <td>
                  <strong>{inv.reference}</strong>
                  <small>{date(inv.dueAt || inv.createdAt)}</small>
                </td>
                <td>{inv.description}</td>
                <td>{money(inv.amount)}</td>
                <td>
                  <Badge tone={inv.status === 'paid' ? 'green' : 'sand'}>
                    {titleCase(inv.status)}
                  </Badge>
                </td>
                <td>
                  {inv.status === 'due' && (
                    <Button
                      kind="secondary"
                      onClick={() =>
                        act(
                          `/invoices/${inv.id}/pay-test`,
                          {},
                          'POST',
                          'Test payment recorded. No money was charged.',
                        ).catch((e: any) => notify(e.message))
                      }
                    >
                      Pay test invoice
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {!s?.cancelledAt && (
        <button className="subtle-link cancel-link" onClick={() => open('cancel')}>
          Request membership cancellation
        </button>
      )}
    </>
  );
}
function FamilyAccess({ data, open, act, notify }: any) {
  const family = data.family.filter((f: Data) => !f.revokedAt);
  return (
    <>
      <SectionTitle
        eyebrow="CARE THAT REACHES YOUR CIRCLE"
        title="Family, kept close."
        description="Choose who can see your health summary and care updates."
        action={
          <Button disabled={family.length >= 3} onClick={() => open('family')}>
            <Plus size={17} />
            Add family viewer
          </Button>
        }
      />
      <div className="family-banner">
        <UsersRound size={43} strokeWidth={1.2} />
        <div>
          <h2>A little reassurance for the people you love.</h2>
          <p>
            You decide what to share. Up to three family viewers, with access you can revoke at any
            time.
          </p>
        </div>
      </div>
      {family.length ? (
        <div className="family-grid">
          {family.map((f: Data) => (
            <article className="panel family-card" key={f.id}>
              <Avatar name={f.name} />
              <h3>{f.name}</h3>
              <p>{f.email}</p>
              <div className="family-permissions">
                <span>
                  <Check size={15} />
                  Health summary
                </span>
                {f.scope === 'summary_updates' && (
                  <span>
                    <Check size={15} />
                    Care updates
                  </span>
                )}
                {f.emergency && (
                  <span>
                    <Check size={15} />
                    Emergency summary
                  </span>
                )}
                {f.consultNotes && (
                  <span>
                    <Check size={15} />
                    Consult notes
                  </span>
                )}
                <span>
                  <LockKeyhole size={15} />
                  Read-only access
                </span>
              </div>
              <Button
                kind="secondary"
                onClick={() => {
                  if (window.confirm(`Revoke ${f.name}’s access immediately?`))
                    act(
                      `/family/${f.id}`,
                      undefined,
                      'DELETE',
                      'Family access revoked immediately.',
                    ).catch((e: any) => notify(e.message));
                }}
              >
                Revoke access
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <Empty icon={UsersRound} title="Your circle, your choice">
          Add someone you trust when you’re ready.
        </Empty>
      )}
    </>
  );
}
function EmergencySummary({ summary: s }: any) {
  return (
    <div className="emergency-summary">
      <div className="summary-title">
        <HeartPulse size={30} />
        <div>
          <h2>{s.name}</h2>
          <p>Health Vault · Updated {date(s.generatedAt, true)}</p>
        </div>
      </div>
      <div className="allergy-alert">
        <strong>ALLERGIES</strong>
        <p>{s.allergies?.join(', ') || 'None recorded — confirm with member'}</p>
      </div>
      <div className="summary-grid">
        <div>
          <h4>Conditions</h4>
          <p>{s.conditions?.join(', ') || 'None recorded'}</p>
        </div>
        <div>
          <h4>Medical aid</h4>
          <p>
            {s.medicalAidScheme || 'Not recorded'}
            <br />
            {s.medicalAidNumber}
          </p>
        </div>
        <div>
          <h4>Doctor</h4>
          <p>
            {s.doctor?.name || 'Not recorded'}
            <br />
            {s.doctor?.phone}
          </p>
        </div>
        <div>
          <h4>Next of kin</h4>
          <p>
            {s.nextOfKin?.name || 'Not recorded'}
            <br />
            {s.nextOfKin?.phone}
          </p>
        </div>
      </div>
      <h4>Current medication</h4>
      {s.medications?.length ? (
        s.medications.map((m: Data) => (
          <p key={m.id}>
            {m.drug} · {m.strength} · {m.directions}
          </p>
        ))
      ) : (
        <p>None recorded</p>
      )}
      <h4>Last three readings</h4>
      {s.vitals?.map((v: Data) => (
        <div className="summary-vital" key={v.id}>
          <span>{titleCase(v.type)}</span>
          <strong>
            {v.value}
            {v.secondary ? `/${v.secondary}` : ''} {v.unit}
          </strong>
          <small>{date(v.takenAt, true)}</small>
        </div>
      ))}
    </div>
  );
}
function SettingsPage({
  data,
  user,
  large,
  contrast,
  setLarge,
  setContrast,
  config,
  open,
  act,
  notify,
}: any) {
  return (
    <>
      <SectionTitle
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your settings"
        description="Comfortable to read. Easy to use. Yours to control."
      />
      <section className="panel settings-panel">
        <h2>Reading & accessibility</h2>
        <label className="toggle-row">
          <div>
            <strong>Large text</strong>
            <p>A little more room for every word.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            checked={large}
            onChange={(e) => setLarge(e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <div>
            <strong>High contrast</strong>
            <p>Stronger contrast for easier reading.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            checked={contrast}
            onChange={(e) => setContrast(e.target.checked)}
          />
        </label>
        <div className="toggle-row">
          <div>
            <strong>Language</strong>
            <p>English · isiZulu and Afrikaans planned for a later release.</p>
          </div>
          <Badge tone="gray">English</Badge>
        </div>
      </section>
      {user.role === 'member' && data && (
        <>
          <section className="panel settings-panel">
            <h2>Your consent, your choice</h2>
            {Object.entries(config.consents).map(([key, label]) => (
              <label key={key} className="toggle-row">
                <div>
                  <strong>{titleCase(key)}</strong>
                  <p>{String(label)}</p>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={data.consents.some((c: Data) => c.type === key && !c.revokedAt)}
                  onChange={(e) =>
                    act(
                      `/members/${data.member.id}/consents`,
                      { type: key, granted: e.target.checked },
                      'PATCH',
                      'Consent choice saved to your history.',
                    ).catch((e: any) => notify(e.message))
                  }
                />
              </label>
            ))}
            <p className="muted small-text">
              Withdrawing care or delivery consent may limit the services your team can provide.
              Your consent history is retained.
            </p>
          </section>
          <section className="panel settings-panel">
            <h2>Your information</h2>
            <div className="button-row">
              <Button kind="secondary" onClick={() => open('profile')}>
                Edit personal details
              </Button>
              <a className="button secondary" href={`/api/members/${data.member.id}/export`}>
                <ArrowDownToLine size={16} />
                Export my data
              </a>
              <Button kind="ghost" onClick={() => open('privacy')}>
                Request deletion
              </Button>
            </div>
            <p className="muted">
              Information officer:{' '}
              {config.informationOfficer ||
                'Contact details must be configured before live launch.'}
            </p>
          </section>
        </>
      )}
      <section className="panel settings-panel">
        <h2>Service details</h2>
        <p>Care team: Monday–Friday, 08:00–17:00. Delivery within 20 km of central Durban.</p>
        <button className="text-link" onClick={() => open('emergency-help')}>
          Emergency contact numbers <ArrowUpRight size={15} />
        </button>
      </section>
    </>
  );
}
function FamilyView({ data, page, emergency }: any) {
  if (!data)
    return (
      <Empty icon={UsersRound} title="Family access is not active">
        A member needs to grant access before you can see their information.
      </Empty>
    );
  return (
    <>
      <SectionTitle
        eyebrow="A LITTLE REASSURANCE"
        title={`${data.member.name}’s care`}
        description="Shared with you by consent. Your access is read-only."
        action={
          data.emergencyAllowed ? (
            <Button kind="secondary" onClick={emergency}>
              <ShieldCheck size={16} />
              Emergency summary
            </Button>
          ) : undefined
        }
      />
      {page === 'family-updates' ? (
        <section className="panel">
          {data.updates?.length ? (
            data.updates.map((u: Data) => (
              <div key={u.id} className="timeline-row">
                <CalendarDays size={22} />
                <div>
                  <h3>{titleCase(u.mode)} consult</h3>
                  <p>
                    {date(u.scheduledAt, true)} · {titleCase(u.status)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <Empty title="No shared care updates">
              Updates appear when the member has granted this scope.
            </Empty>
          )}
        </section>
      ) : (
        <section className="panel">
          <EmergencySummary summary={data.summary} />
          {data.consults?.length > 0 && (
            <>
              <h3>Explicitly shared consult notes</h3>
              {data.consults
                .filter((c: Data) => c.signedAt)
                .map((c: Data) => (
                  <p key={c.id}>
                    {date(c.signedAt)} · {c.note}
                  </p>
                ))}
            </>
          )}
        </section>
      )}
    </>
  );
}
function AuditTable({ rows }: any) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: Data) => (
            <tr key={r.id}>
              <td>{date(r.at, true)}</td>
              <td>{r.actorId}</td>
              <td>{titleCase(r.action)}</td>
              <td>{titleCase(r.entity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffView({
  staff: s,
  data,
  user,
  page,
  go,
  query,
  setQuery,
  openMember,
  open,
  act,
  notify,
}: any) {
  if (!s) return <Empty title="Loading your workspace">Just a moment…</Empty>;
  const name = (id: string) => s.members?.find((m: Data) => m.id === id)?.name || 'Member';
  const flags = s.vitals?.filter((v: Data) => v.flagged && !v.reviewedAt) || [],
    requests = s.consults?.filter((c: Data) => c.status === 'requested') || [];
  if (page === 'member-record' && data)
    return (
      <>
        <button className="text-link back-link" onClick={() => go('members')}>
          <ArrowLeft size={16} />
          Back to members
        </button>
        <SectionTitle
          eyebrow="MEMBER RECORD"
          title={data.member.name}
          description={`${titleCase(data.member.tier)} · ${titleCase(data.member.status)}`}
        />
        {user.role === 'admin' ? (
          <Membership data={data} open={open} act={act} notify={notify} />
        ) : (
          <Vault
            data={data}
            query={query}
            setQuery={setQuery}
            open={open}
            emergency={async () => {
              try {
                open('emergency', { summary: await api(`/members/${data.member.id}/emergency`) });
              } catch (e: any) {
                notify(e.message);
              }
            }}
            notify={notify}
          />
        )}
      </>
    );
  if (user.role === 'driver' || user.role === 'pharmacy' || page === 'orders')
    return (
      <>
        <SectionTitle
          eyebrow="PRESCRIPTION TO DOOR"
          title={user.role === 'driver' ? 'Your delivery round.' : 'Script & order board'}
          description={
            user.role === 'driver'
              ? 'A little care, delivered personally.'
              : 'Follow each prescription through preparation and delivery.'
          }
        />
        <div className="order-board">
          {(s.orders || []).map((o: Data) => (
            <article className="panel order-card" key={o.id}>
              <div className="section-line">
                <span className="soft-icon">
                  <Package size={23} />
                </span>
                <Badge tone={o.status === 'delivered' ? 'green' : 'sand'}>
                  {titleCase(o.status)}
                </Badge>
              </div>
              <h2>{o.name || name(o.memberId)}</h2>
              <p>{o.pharmacy}</p>
              {o.address && (
                <p className="inline-note">
                  <MapPin size={15} />
                  {o.address}
                </p>
              )}
              {user.role === 'pharmacy' &&
                o.items?.map((item: Data, i: number) => (
                  <div className="script-item" key={i}>
                    <strong>
                      {item.drug} {item.strength}
                    </strong>
                    <p>
                      {item.quantity} · {item.directions}
                    </p>
                  </div>
                ))}
              <button className="text-link" onClick={() => open('order', { item: o })}>
                View journey <ArrowUpRight size={15} />
              </button>
              <div className="button-row">
                {user.role === 'pharmacy' && ['sent', 'dispensing'].includes(o.status) && (
                  <Button
                    onClick={() =>
                      act(
                        `/orders/${o.id}/advance`,
                        { status: o.status === 'sent' ? 'dispensing' : 'ready' },
                        'POST',
                        'Order status updated.',
                      ).catch((e: any) => notify(e.message))
                    }
                  >
                    {o.status === 'sent' ? 'Start dispensing' : 'Ready for collection'}
                  </Button>
                )}
                {user.role === 'driver' && o.status === 'ready' && (
                  <Button
                    onClick={() =>
                      act(
                        `/orders/${o.id}/advance`,
                        { status: 'collected' },
                        'POST',
                        'Collection confirmed.',
                      ).catch((e: any) => notify(e.message))
                    }
                  >
                    Confirm collection <Check size={16} />
                  </Button>
                )}
                {user.role === 'driver' && o.status === 'collected' && (
                  <Button onClick={() => open('delivery', { item: o })}>
                    Record demo delivery <CheckCheck size={16} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!s.orders?.length && (
          <Empty icon={Truck} title="No orders in your queue">
            Assigned prescriptions and deliveries will appear here.
          </Empty>
        )}
      </>
    );
  return (
    <>
      <SectionTitle
        eyebrow="CARE TEAM WORKSPACE"
        title={
          page === 'overview'
            ? `A good day to care, ${user.role === 'doctor' ? 'Doctor' : user.name.split(' ')[0]}.`
            : page === 'members'
              ? 'Your member community.'
              : page === 'queue'
                ? 'A closer look at today’s readings.'
                : page === 'consults'
                  ? 'Time for a conversation.'
                  : page === 'documents'
                    ? 'Complete the health story.'
                    : page === 'billing'
                      ? 'Memberships & billing'
                      : page === 'audit'
                        ? 'Every access, accounted for.'
                        : 'Care, in the community.'
        }
        description={
          page === 'overview'
            ? 'A clear picture of the people counting on you today.'
            : page === 'queue'
              ? 'Flags support review. Clinical decisions stay with the care team.'
              : 'Keep care personal, connected, and easy to follow.'
        }
      />
      {page === 'overview' && (
        <>
          <div className="staff-stats">
            {[
              [s.members?.length || 0, 'Members in your care', UsersRound, 'members'],
              [
                user.role === 'admin'
                  ? s.invoices?.filter((i: Data) => i.status === 'due').length || 0
                  : flags.length,
                user.role === 'admin' ? 'Invoices to follow up' : 'Readings for review',
                HeartPulse,
                user.role === 'admin' ? 'billing' : 'queue',
              ],
              [s.documents?.length || 0, 'Documents to verify', FileText, 'documents'],
              [
                user.role === 'admin' ? s.privacyRequests?.length || 0 : requests.length,
                user.role === 'admin' ? 'Privacy requests' : 'Consult requests',
                ClipboardList,
                user.role === 'admin' ? 'audit' : 'consults',
              ],
            ].map(([n, label, Icon, target]: any) => (
              <button className="panel stat-card" key={label} onClick={() => go(target)}>
                <span className="soft-icon">
                  <Icon size={22} />
                </span>
                <strong>{n}</strong>
                <span>{label}</span>
                <ArrowUpRight className="stat-arrow" size={18} />
              </button>
            ))}
          </div>
          <div className="staff-overview-grid">
            <section className="panel">
              <div className="section-line">
                <h2>{user.role === 'admin' ? 'Member community' : 'Needs a little attention'}</h2>
                <button
                  className="text-link"
                  onClick={() => go(user.role === 'admin' ? 'members' : 'queue')}
                >
                  View all <ArrowUpRight size={15} />
                </button>
              </div>
              {user.role === 'admin' ? (
                s.members?.slice(0, 5).map((m: Data) => (
                  <button key={m.id} className="member-list-row" onClick={() => openMember(m.id)}>
                    <Avatar small name={m.name} />
                    <div>
                      <strong>{m.name}</strong>
                      <p>{titleCase(m.tier)}</p>
                    </div>
                    <Badge>{titleCase(m.status)}</Badge>
                    <ChevronRight size={17} />
                  </button>
                ))
              ) : flags.length ? (
                flags.slice(0, 5).map((v: Data) => (
                  <div className="queue-row" key={v.id}>
                    <Avatar name={name(v.memberId)} small />
                    <div>
                      <strong>{name(v.memberId)}</strong>
                      <p>
                        {titleCase(v.type)} · {v.value}
                        {v.secondary ? `/${v.secondary}` : ''} {v.unit}
                      </p>
                    </div>
                    <Button kind="secondary" onClick={() => open('review', { item: v })}>
                      Review
                    </Button>
                  </div>
                ))
              ) : (
                <Empty icon={CheckCircle2} title="No outstanding reading flags">
                  Your review queue is clear.
                </Empty>
              )}
            </section>
            <section className="staff-note">
              <span className="soft-icon light">
                <HeartHandshake size={30} />
              </span>
              <h2>
                Small moments.
                <br />
                <em>Meaningful care.</em>
              </h2>
              <p>
                A check-in, a reading, a familiar voice. Every interaction adds to a member’s health
                story.
              </p>
              <button className="text-link" onClick={() => go('members')}>
                Open member records <ArrowRight size={16} />
              </button>
            </section>
          </div>
          {user.role === 'admin' && s.privacyRequests?.length > 0 && (
            <section className="panel">
              <h2>Privacy requests awaiting review</h2>
              {s.privacyRequests.map((r: Data) => (
                <div className="timeline-row" key={r.id}>
                  <ShieldCheck />
                  <div>
                    <h3>{name(r.memberId)}</h3>
                    <p>{r.reason}</p>
                  </div>
                  <Badge tone="sand">{titleCase(r.status)}</Badge>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {page === 'members' && (
        <>
          <div className="toolbar">
            <div className="search-box">
              <Search size={17} />
              <input
                className="search-input"
                aria-label="Search members"
                placeholder="Search by name, email or tier"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Badge tone="gray">{s.members?.length || 0} members</Badge>
          </div>
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Membership</th>
                  <th>Status</th>
                  <th>Coordinator</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.members
                  ?.filter((m: Data) =>
                    `${m.name} ${m.email} ${m.tier}`.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((m: Data) => (
                    <tr key={m.id}>
                      <td>
                        <span className="table-person">
                          <Avatar name={m.name} small />
                          <span>
                            <strong>{m.name}</strong>
                            <small>{m.email}</small>
                          </span>
                        </span>
                      </td>
                      <td>{titleCase(m.tier)}</td>
                      <td>
                        <Badge tone={m.status === 'active' ? 'green' : 'sand'}>
                          {titleCase(m.status)}
                        </Badge>
                      </td>
                      <td>{m.coordinator}</td>
                      <td>
                        <button className="text-link" onClick={() => openMember(m.id)}>
                          Open record
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      {page === 'queue' && (
        <>
          <div className="section-line">
            <h2>Flagged readings</h2>
            <Badge tone="sand">{flags.length} awaiting review</Badge>
          </div>
          <section className="panel">
            {flags.length ? (
              flags.map((v: Data) => (
                <div className="queue-row" key={v.id}>
                  <Avatar name={name(v.memberId)} />
                  <div>
                    <strong>{name(v.memberId)}</strong>
                    <p>
                      {titleCase(v.type)} ·{' '}
                      <b>
                        {v.value}
                        {v.secondary ? `/${v.secondary}` : ''} {v.unit}
                      </b>{' '}
                      · {date(v.takenAt, true)}
                    </p>
                  </div>
                  <Button kind="secondary" onClick={() => open('review', { item: v })}>
                    Review reading
                  </Button>
                </div>
              ))
            ) : (
              <Empty title="No readings awaiting review" icon={CheckCircle2}>
                New flagged readings will appear here.
              </Empty>
            )}
          </section>
          <div className="section-line">
            <h2>Missed readings</h2>
          </div>
          <section className="panel">
            {s.missed?.length ? (
              s.missed.map((m: Data) => (
                <div className="queue-row" key={m.memberId}>
                  <Clock3 size={24} />
                  <div>
                    <strong>{m.name}</strong>
                    <p>{m.reason}</p>
                  </div>
                  <button className="text-link" onClick={() => openMember(m.memberId)}>
                    Open record <ArrowRight size={16} />
                  </button>
                </div>
              ))
            ) : (
              <Empty icon={CheckCircle2} title="No missing-reading follow-ups">
                Monitor and Concierge members with no reading for two days are shown here.
              </Empty>
            )}
          </section>
        </>
      )}
      {page === 'consults' && (
        <div className="consult-list">
          {s.consults?.map((c: Data) => (
            <section className="panel consult-card" key={c.id}>
              <span className="soft-icon">
                <Video size={23} />
              </span>
              <div>
                <div className="consult-title">
                  <h3>{name(c.memberId)}</h3>
                  <Badge tone={c.status === 'requested' ? 'sand' : 'green'}>
                    {titleCase(c.status)}
                  </Badge>
                </div>
                <p>{c.reason}</p>
                <small>
                  {date(c.scheduledAt, true)} · {titleCase(c.mode)}
                </small>
                {c.signedAt && (
                  <div className="consult-note">
                    <LockKeyhole size={13} />
                    {c.note}
                  </div>
                )}
              </div>
              {user.role === 'doctor' && c.status === 'requested' && (
                <Button kind="secondary" onClick={() => open('accept', { item: c })}>
                  Schedule
                </Button>
              )}
              {user.role === 'doctor' && c.status === 'scheduled' && c.doctorId === user.id && (
                <Button onClick={() => open('sign', { item: c })}>Complete consult</Button>
              )}
            </section>
          ))}
        </div>
      )}
      {page === 'documents' && (
        <section className="panel">
          {s.documents?.length ? (
            s.documents.map((d: Data) => (
              <div className="queue-row" key={d.id}>
                <span className="soft-icon">
                  <FileText size={22} />
                </span>
                <div>
                  <strong>{d.name}</strong>
                  <p>
                    {name(d.memberId)} · {titleCase(d.type)} · {d.documentDate}
                  </p>
                </div>
                {['nurse', 'admin'].includes(user.role) && (
                  <Button kind="secondary" onClick={() => open('verify-document', { item: d })}>
                    Verify document
                  </Button>
                )}
              </div>
            ))
          ) : (
            <Empty title="Every document is accounted for" icon={CheckCircle2}>
              New imports appear here for staff verification.
            </Empty>
          )}
        </section>
      )}
      {page === 'billing' && (
        <>
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.invoices?.map((i: Data) => (
                  <tr key={i.id}>
                    <td>{name(i.memberId)}</td>
                    <td>
                      {i.description}
                      <small>{i.reference}</small>
                    </td>
                    <td>{money(i.amount)}</td>
                    <td>
                      <Badge tone={i.status === 'paid' ? 'green' : 'sand'}>
                        {titleCase(i.status)}
                      </Badge>
                    </td>
                    <td>
                      <button className="text-link" onClick={() => openMember(i.memberId)}>
                        Manage
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <Notice>
            Local test billing. A payment gateway, signed webhooks and recurring collection
            processing must be connected before taking real retainers.
          </Notice>
        </>
      )}
      {page === 'audit' && (
        <section className="panel">
          <AuditTable rows={s.audit || []} />
        </section>
      )}
      {page === 'clinics' && (
        <>
          <div className="care-options">
            {s.villages?.map((v: Data) => (
              <section className="panel" key={v.id}>
                <span className="soft-icon">
                  <Home size={25} />
                </span>
                <h2>{v.name}</h2>
                <p>{v.address}</p>
                <div className="profile-strip">
                  <div>
                    <small>CLINIC DAY</small>
                    <p>{v.clinicDay}</p>
                  </div>
                  <div>
                    <small>RESIDENTS</small>
                    <p>{v.residentCount}</p>
                  </div>
                </div>
                <p className="muted">Group contract priced per site · Monitor-level care</p>
                {s.clinics
                  ?.filter((c: Data) => c.villageId === v.id)
                  .map((c: Data) => (
                    <div className="clinic-date" key={c.id}>
                      <CalendarDays size={20} />
                      Next clinic: {date(c.date, true)}
                    </div>
                  ))}
              </section>
            ))}
          </div>
          <Notice>
            Village scheduling and attendance management are planned after the foundation and
            membership sprints. This view shows the seeded group-account structure.
          </Notice>
        </>
      )}
    </>
  );
}

function EmergencyRedeem({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  return (
    <div className="share-page">
      <Logo />
      <section className="panel">
        {data ? (
          <>
            <EmergencySummary summary={data} />
            <Button onClick={() => window.print()}>
              <Printer size={16} />
              Print summary
            </Button>
          </>
        ) : (
          <>
            <h1>Shared health summary</h1>
            <p>
              Enter the one-time code provided by the member. Links expire after 24 hours and can be
              used once.
            </p>
            <Form
              label="Open summary"
              onSubmit={async (f) =>
                setData(await api('/emergency/redeem', 'POST', { token, code: f.get('code') }))
              }
            >
              <Field label="Six-digit code">
                <input name="code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} />
              </Field>
            </Form>
          </>
        )}
      </section>
    </div>
  );
}
const shareToken = location.pathname.match(/^\/share\/([a-f0-9]{48})$/)?.[1];
createRoot(document.getElementById('root')!).render(
  shareToken ? <EmergencyRedeem token={shareToken} /> : <App />,
);
