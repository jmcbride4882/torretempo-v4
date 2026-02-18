import { useState } from 'react';
import {
  Clock,
  Play,
  Check,
  LayoutDashboard,
  Timer,
  CalendarDays,
  Users,
  ArrowLeftRight,
  Palmtree,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  StickyNote,
  ChevronDown,
  Zap,
  Star,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const sidebarNav = [
  {
    label: 'MAIN',
    items: [
      { icon: LayoutDashboard, text: 'Dashboard', active: true },
      { icon: Timer, text: 'Clock', active: false },
      { icon: CalendarDays, text: 'Roster', active: false },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { icon: Users, text: 'Team', active: false },
      { icon: ArrowLeftRight, text: 'Swaps', active: false },
      { icon: Palmtree, text: 'Leave', active: false },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { icon: BarChart3, text: 'Reports', active: false },
      { icon: Bell, text: 'Notifications', active: false },
    ],
  },
  {
    label: 'CONFIG',
    items: [
      { icon: Settings, text: 'Settings', active: false },
      { icon: CreditCard, text: 'Billing', active: false },
    ],
  },
];

const statsData = [
  { label: 'Active Employees', value: '47', change: '+3', trend: 'up' as const, sub: 'vs last month' },
  { label: 'Hours This Week', value: '1,842', change: '+5.2%', trend: 'up' as const, sub: 'vs last week' },
  { label: 'Pending Swaps', value: '8', change: '-2', trend: 'down' as const, sub: 'vs yesterday' },
  { label: 'Compliance Score', value: '98%', change: '+1%', trend: 'up' as const, sub: 'monthly avg' },
];

const employees = [
  { name: 'Maria Garcia', avatar: 'MG', role: 'Owner', dept: 'Management', hours: 38, maxHours: 40, status: 'Active' as const },
  { name: 'Carlos Lopez', avatar: 'CL', role: 'Manager', dept: 'Kitchen', hours: 42, maxHours: 40, status: 'Active' as const },
  { name: 'Ana Martinez', avatar: 'AM', role: 'Employee', dept: 'Front of House', hours: 35, maxHours: 40, status: 'Active' as const },
  { name: 'Pedro Sanchez', avatar: 'PS', role: 'Employee', dept: 'Kitchen', hours: 12, maxHours: 40, status: 'On Leave' as const },
  { name: 'Laura Fernandez', avatar: 'LF', role: 'Manager', dept: 'Bar', hours: 40, maxHours: 40, status: 'Active' as const },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function LandingHero() {
  return (
    <section className="relative min-h-[600px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center">
        {/* Pill badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-violet-300 backdrop-blur">
          <Zap className="h-4 w-4" />
          Now with AI-powered auto-scheduling
        </div>

        <h1 className="max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
          The{' '}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            future
          </span>{' '}
          of workforce management
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
          Purpose-built for Spanish SMBs. Compliance, scheduling, and time tracking in one platform.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98]">
            Start free trial
          </button>
          <button className="rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]">
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Watch demo
            </span>
          </button>
        </div>

        {/* Glass metric cards */}
        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { value: '2s', label: 'Clock-in' },
            { value: '1min', label: 'Payroll' },
            { value: '5min', label: 'Audit' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-lg transition hover:border-white/30 hover:bg-white/[0.14]"
            >
              <div className="text-3xl font-bold tracking-tight text-cyan-400">{m.value}</div>
              <div className="mt-1 text-sm text-slate-300">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const tiers = [
    {
      name: 'Starter',
      price: 29,
      desc: 'For small teams getting started',
      limit: 'Up to 10 employees',
      features: ['Time tracking', 'Basic scheduling', 'Compliance alerts', 'Mobile app', 'Email support'],
      cta: 'Start free trial',
      highlighted: false,
      dark: false,
    },
    {
      name: 'Growth',
      price: 69,
      desc: 'For growing businesses',
      limit: 'Up to 30 employees',
      features: [
        'Everything in Starter',
        'Auto-scheduling',
        'Shift swaps',
        'Leave management',
        'ITSS audit portal',
        'Priority support',
      ],
      cta: 'Start free trial',
      highlighted: true,
      dark: false,
    },
    {
      name: 'Business',
      price: 149,
      desc: 'Enterprise-grade features',
      limit: 'Unlimited employees',
      features: [
        'Everything in Growth',
        'Multi-location',
        'Advanced analytics',
        'API access',
        'Custom integrations',
        'Dedicated account manager',
      ],
      cta: 'Contact sales',
      highlighted: false,
      dark: true,
    },
  ];

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-slate-500">No hidden fees. Cancel anytime.</p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl p-8 transition ${
                tier.dark
                  ? 'bg-slate-900 text-white shadow-xl'
                  : tier.highlighted
                    ? 'bg-white shadow-lg shadow-slate-200/50 ring-[3px] ring-violet-500'
                    : 'bg-white shadow-lg shadow-slate-200/50'
              }`}
            >
              {/* Popular badge */}
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3
                  className={`text-lg font-semibold ${tier.dark ? 'text-white' : 'text-slate-900'}`}
                >
                  {tier.name}
                </h3>
                <p className={`mt-1 text-sm ${tier.dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tier.desc}
                </p>
              </div>

              <div className="mt-6">
                <span className={`text-5xl font-bold tracking-tight ${tier.dark ? 'text-white' : 'text-slate-900'}`}>
                  &euro;{tier.price}
                </span>
                <span className={`text-base ${tier.dark ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
                <div className={`mt-1 text-sm ${tier.dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tier.limit}
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check
                      className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                        tier.dark ? 'text-violet-400' : 'text-violet-500'
                      }`}
                    />
                    <span className={`text-sm ${tier.dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full rounded-xl py-3.5 text-sm font-semibold transition active:scale-[0.98] ${
                  tier.dark
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : tier.highlighted
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl'
                      : 'border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          All plans include a <span className="font-semibold text-violet-600">14-day free trial</span>. No credit card required.
        </p>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            Powerful dashboard, zero complexity
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Everything you need at a glance. Real-time insights for smarter decisions.
          </p>
        </div>

        {/* Dashboard shell */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="flex min-h-[560px]">
            {/* Sidebar */}
            <aside className="hidden w-[280px] flex-shrink-0 flex-col bg-slate-900 md:flex">
              {/* Logo */}
              <div className="flex items-center gap-3 px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span className="text-base font-bold text-white">Torre Tempo</span>
              </div>

              {/* Nav */}
              <nav className="flex-1 space-y-6 px-3 py-4">
                {sidebarNav.map((section) => (
                  <div key={section.label}>
                    <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      {section.label}
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.text}
                            className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                              item.active
                                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {/* Active left accent */}
                            {item.active && (
                              <div className="absolute left-0 h-6 w-[3px] rounded-r bg-gradient-to-b from-violet-500 to-indigo-500" />
                            )}
                            <Icon className={`h-[18px] w-[18px] ${item.active ? 'text-violet-400' : ''}`} />
                            {item.text}
                            {item.active && (
                              <div className="ml-auto h-2 w-2 rounded-full bg-violet-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* User card */}
              <div className="mx-3 mb-4 rounded-xl bg-slate-800/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                    JM
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium text-white">Jamie McBride</div>
                    <div className="text-xs text-slate-400">Owner</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1">
              {/* Top bar */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Dashboard</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-medium text-slate-900">Overview</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search...</span>
                  </div>
                  <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50">
                    <Bell className="h-4 w-4 text-slate-500" />
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-violet-500" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
                {statsData.map((s) => (
                  <div
                    key={s.label}
                    className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/50"
                  >
                    {/* Top accent */}
                    <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500" />
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {s.label}
                    </div>
                    <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      {s.value}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {s.trend === 'up' ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          s.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {s.change}
                      </span>
                      <span className="text-xs text-slate-400">{s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmployeeTable() {
  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      Owner: 'bg-violet-100 text-violet-700',
      Manager: 'bg-indigo-100 text-indigo-700',
      Employee: 'bg-slate-100 text-slate-700',
    };
    return map[role] ?? map.Employee;
  };

  const statusPill = (status: 'Active' | 'On Leave') => {
    if (status === 'Active')
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Active
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        On Leave
      </span>
    );
  };

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            Your team, at a glance
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Track hours, manage roles, and stay compliant in real time.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400">
                <Search className="h-4 w-4" />
                <span>Search employees...</span>
              </div>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-600 transition hover:bg-slate-50">
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </div>
            <button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl active:scale-[0.98]">
              + Add Employee
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Name
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Hours This Week
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const pct = Math.min((emp.hours / emp.maxHours) * 100, 100);
                  const overLimit = emp.hours > emp.maxHours;
                  return (
                    <tr
                      key={emp.name}
                      className="transition hover:bg-violet-50/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                            {emp.avatar}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${roleBadge(emp.role)}`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {emp.dept}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                overLimit
                                  ? 'bg-red-500'
                                  : 'bg-gradient-to-r from-violet-500 to-cyan-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              overLimit ? 'text-red-600' : 'text-slate-700'
                            }`}
                          >
                            {emp.hours}h
                          </span>
                          <span className="text-xs text-slate-400">/ {emp.maxHours}h</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{statusPill(emp.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-sm text-slate-500">
            <span>Showing 5 of 47 employees</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition ${
                    p === 1
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreateShiftForm() {
  const [employee, setEmployee] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <section className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl bg-white p-8 shadow-lg shadow-slate-200/50">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create New Shift</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Employee */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Employee</label>
              <div className="relative">
                <select
                  value={employee}
                  onChange={(e) => setEmployee(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.name} - {emp.dept}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {employee && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[10px] font-bold text-white">
                    {employee
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <span className="text-xs text-slate-500">{employee}</span>
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Start / End time side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">Select location...</option>
                  <option value="main">Main Restaurant</option>
                  <option value="terrace">Terrace Bar</option>
                  <option value="kitchen">Central Kitchen</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5 text-slate-400" />
                  Notes
                </span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this shift..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="h-12 rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98]"
              >
                Create Shift
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function DesignC() {
  return (
    <div className="min-h-screen bg-slate-50 font-['Inter',sans-serif]">
      <LandingHero />
      <PricingSection />
      <DashboardPreview />
      <EmployeeTable />
      <CreateShiftForm />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">Torre Tempo</span>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Design C: Bold &amp; Energetic &mdash; Playground Preview
          </p>
        </div>
      </footer>
    </div>
  );
}
