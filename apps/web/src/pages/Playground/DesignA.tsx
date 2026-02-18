import { useState } from 'react';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  ArrowLeftRight,
  Palmtree,
  BarChart3,
  Settings,
  CreditCard,
  Search,
  Check,
  ChevronRight,
  Play,
  Zap,
  FileText,
  ShieldCheck,
  Bell,
  LogOut,
  MoreHorizontal,
  Plus,
  X,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Clock, label: 'Clock In/Out', active: false },
  { icon: CalendarDays, label: 'Roster', active: false },
  { icon: Users, label: 'Team', active: false },
  { icon: ArrowLeftRight, label: 'Swaps', active: false },
  { icon: Palmtree, label: 'Leave', active: false },
  { icon: BarChart3, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false },
  { icon: CreditCard, label: 'Billing', active: false },
];

const EMPLOYEES = [
  { name: 'Maria Garcia', role: 'Manager', department: 'Operations', hours: '38.5', status: 'Active' as const },
  { name: 'Carlos Lopez', role: 'Waiter', department: 'Front of House', hours: '40.0', status: 'Active' as const },
  { name: 'Ana Martinez', role: 'Chef', department: 'Kitchen', hours: '36.0', status: 'On Leave' as const },
  { name: 'Javier Fernandez', role: 'Bartender', department: 'Front of House', hours: '42.0', status: 'Active' as const },
  { name: 'Laura Sanchez', role: 'Host', department: 'Front of House', hours: '32.5', status: 'Active' as const },
];

const PRICING_TIERS = [
  {
    name: 'Starter',
    price: 29,
    desc: 'For small teams getting started',
    employees: 'Up to 10 employees',
    popular: false,
    features: [
      'Time tracking & clock-in',
      'Basic scheduling',
      'Employee profiles',
      'Mobile app access',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: 69,
    desc: 'For growing businesses',
    employees: 'Up to 30 employees',
    popular: true,
    features: [
      'Everything in Starter',
      'Advanced roster management',
      'Leave management',
      'Compliance monitoring',
      'Payroll export',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    price: 149,
    desc: 'For larger organizations',
    employees: 'Unlimited employees',
    popular: false,
    features: [
      'Everything in Growth',
      'ITSS audit portal',
      'Geofencing',
      'Custom reports',
      'API access',
      'Dedicated account manager',
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function DesignA() {
  const [activeNav, setActiveNav] = useState(0);

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-[#09090b]">
      {/* Floating label */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center">
        <div className="mt-3 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-500 shadow-sm">
          Design A: Modern SaaS Minimal
        </div>
      </div>

      {/* ━━━ Section 1: Landing Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.025em] text-zinc-950 sm:text-5xl">
            Workforce management,{' '}
            <span className="text-[#6366f1]">simplified.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
            Built for Spanish SMBs. Compliant by default.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5558e6]">
              Start free trial
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
              <Play className="h-4 w-4 text-zinc-400" />
              Watch demo
            </button>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4">
            {[
              { value: '2s', label: 'clock-in', icon: Zap },
              { value: '1 min', label: 'payroll', icon: FileText },
              { value: '5 min', label: 'audit', icon: ShieldCheck },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-zinc-200 bg-white p-5"
              >
                <metric.icon className="mx-auto h-5 w-5 text-zinc-400" />
                <p className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-zinc-500">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Section 2: Pricing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-b border-zinc-200 bg-[#fafafa]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              No hidden fees. No per-employee charges on Starter.
            </p>
            <span className="mt-4 inline-block rounded-full border border-[#6366f1]/20 bg-[#6366f1]/5 px-3 py-1 text-xs font-medium text-[#6366f1]">
              14-day free trial
            </span>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg border bg-white p-6 ${
                  tier.popular
                    ? 'border-[#6366f1] ring-1 ring-[#6366f1]'
                    : 'border-zinc-200'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#6366f1] px-3 py-0.5 text-xs font-medium text-white">
                    Popular
                  </span>
                )}
                <h3 className="text-sm font-medium text-zinc-950">{tier.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{tier.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.025em] text-zinc-950">
                    &euro;{tier.price}
                  </span>
                  <span className="text-sm text-zinc-400">/month</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{tier.employees}</p>

                <button
                  className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    tier.popular
                      ? 'bg-[#6366f1] text-white hover:bg-[#5558e6]'
                      : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  Get started
                </button>

                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Section 3: Dashboard Preview ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
            Your command center
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Everything you need, nothing you don&apos;t.
          </p>

          {/* Dashboard shell */}
          <div className="mt-12 overflow-hidden rounded-lg border border-zinc-200">
            <div className="flex min-h-[480px]">
              {/* Sidebar */}
              <div className="flex w-56 shrink-0 flex-col bg-[#18181b] text-white">
                {/* Logo area */}
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6366f1] text-xs font-bold text-white">
                    TT
                  </div>
                  <span className="text-sm font-medium text-zinc-100">Torre Tempo</span>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-2 py-3">
                  <ul className="space-y-0.5">
                    {NAV_ITEMS.map((item, i) => (
                      <li key={item.label}>
                        <button
                          onClick={() => setActiveNav(i)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                            activeNav === i
                              ? 'bg-white/10 text-white'
                              : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                          }`}
                        >
                          {activeNav === i && (
                            <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[#6366f1]" />
                          )}
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* User footer */}
                <div className="border-t border-white/10 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
                      MG
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-200">Maria Garcia</p>
                      <p className="truncate text-[11px] text-zinc-500">Owner</p>
                    </div>
                    <LogOut className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex flex-1 flex-col bg-[#fafafa]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
                  <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                    <Search className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-400">Search...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="relative rounded-md p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600">
                      <Bell className="h-4 w-4" />
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                    </button>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366f1] text-xs font-medium text-white">
                      MG
                    </div>
                  </div>
                </div>

                {/* Dashboard body */}
                <div className="flex-1 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.025em] text-zinc-950">
                        Dashboard
                      </h3>
                      <p className="text-xs text-zinc-500">Monday, 17 Feb 2026</p>
                    </div>
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5558e6]">
                      <Plus className="h-3.5 w-3.5" />
                      Quick clock-in
                    </button>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Clocked In', value: '12', change: '+2 vs yesterday' },
                      { label: 'Hours Today', value: '94.5', change: 'On track' },
                      { label: 'Open Shifts', value: '3', change: '2 urgent' },
                      { label: 'Pending Requests', value: '5', change: '2 swaps, 3 leave' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                      >
                        <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
                        <p className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-400">{stat.change}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini table preview */}
                  <div className="mt-6 rounded-lg border border-zinc-200 bg-white">
                    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                      <p className="text-sm font-medium text-zinc-950">Recent Activity</p>
                      <button className="text-xs text-[#6366f1] hover:underline">View all</button>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {[
                        { who: 'Carlos Lopez', action: 'Clocked in', time: '08:02' },
                        { who: 'Laura Sanchez', action: 'Requested leave', time: '07:45' },
                        { who: 'Javier Fernandez', action: 'Shift swap approved', time: '07:30' },
                      ].map((row) => (
                        <div
                          key={row.who + row.action}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-500">
                              {row.who.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-zinc-800">{row.who}</p>
                              <p className="text-[11px] text-zinc-400">{row.action}</p>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400">{row.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Section 4: Data Table ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-b border-zinc-200 bg-[#fafafa]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
            Employee directory
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your entire workforce from one place.
          </p>

          <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {/* Table toolbar */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs text-zinc-400">Search employees...</span>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5558e6]">
                <Plus className="h-3.5 w-3.5" />
                Add employee
              </button>
            </div>

            {/* Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Department
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Hours This Week
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {EMPLOYEES.map((emp) => (
                  <tr
                    key={emp.name}
                    className="transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                          {emp.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-zinc-900">
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{emp.role}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-600">
                      {emp.hours}h
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          emp.status === 'Active'
                            ? 'bg-[#22c55e]/10 text-[#22c55e]'
                            : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table footer */}
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2.5">
              <p className="text-xs text-zinc-400">Showing 5 of 24 employees</p>
              <div className="flex items-center gap-1">
                <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50">
                  Previous
                </button>
                <button className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
                  1
                </button>
                <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50">
                  2
                </button>
                <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50">
                  3
                </button>
                <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Section 5: Form (Create Shift) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
            Create a shift
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Clean, focused forms that get out of your way.
          </p>

          <div className="mt-8 max-w-lg rounded-lg border border-zinc-200 bg-white p-6">
            <div className="space-y-5">
              {/* Employee */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Employee
                </label>
                <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20">
                  <option value="">Select an employee</option>
                  <option>Maria Garcia</option>
                  <option>Carlos Lopez</option>
                  <option>Ana Martinez</option>
                  <option>Javier Fernandez</option>
                  <option>Laura Sanchez</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Date
                </label>
                <input
                  type="date"
                  defaultValue="2026-02-18"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
                />
              </div>

              {/* Start / End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    defaultValue="17:00"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Location
                </label>
                <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20">
                  <option value="">Select a location</option>
                  <option>Main Restaurant - Calle Mayor 12</option>
                  <option>Terrace Bar - Plaza del Sol 3</option>
                  <option>Kitchen - Calle Mayor 12</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional instructions for this shift..."
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  <X className="h-4 w-4 text-zinc-400" />
                  Cancel
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5558e6]">
                  <Plus className="h-4 w-4" />
                  Create Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
