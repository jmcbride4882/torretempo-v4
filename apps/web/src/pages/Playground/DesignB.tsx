import { useState } from 'react';
import {
  Clock,
  Home,
  Fingerprint,
  CalendarDays,
  Users,
  ArrowLeftRight,
  CalendarOff,
  BarChart3,
  Settings,
  CreditCard,
  Search,
  Bell,
  ChevronDown,
  Check,
  MapPin,
  Plus,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Star,
  ArrowRight,
  Play,
  Shield,
} from 'lucide-react';

// ── Sidebar Nav Item ──────────────────────────────────────────────────
function SidebarItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200
        ${
          active
            ? 'bg-[#ccfbf1] text-[#0d9488]'
            : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
        }
      `}
      style={{ minHeight: 48 }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[#0d9488]" />
      )}
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  changeType,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}) {
  const changeColor =
    changeType === 'up'
      ? 'text-[#10b981]'
      : changeType === 'down'
        ? 'text-[#ef4444]'
        : 'text-[#64748b]';
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#64748b]">{label}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ccfbf1]">
          <Icon size={20} className="text-[#0d9488]" />
        </div>
      </div>
      <span className="text-2xl font-bold text-[#0f172a]">{value}</span>
      <span className={`text-xs font-medium ${changeColor}`}>{change}</span>
    </div>
  );
}

// ── Pricing Card ──────────────────────────────────────────────────────
function PricingCard({
  name,
  price,
  desc,
  features,
  highlight = false,
  badge,
}: {
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`
        relative flex flex-1 flex-col rounded-2xl bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md
        ${highlight ? 'border-2 border-[#0d9488]' : 'border border-[#e2e8f0]'}
      `}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f59e0b] px-4 py-1 text-xs font-bold text-white">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-bold text-[#0f172a]">{name}</h3>
      <p className="mt-1 text-sm text-[#64748b]">{desc}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-[#0f172a]">{price}</span>
        <span className="text-sm text-[#64748b]">/mes</span>
      </div>
      <ul className="mt-6 flex flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[#0f172a]">
            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ccfbf1]">
              <Check size={12} className="text-[#0d9488]" />
            </div>
            {f}
          </li>
        ))}
      </ul>
      <button
        className={`
          mt-8 flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold transition-all duration-200
          ${
            highlight
              ? 'bg-[#0d9488] text-white hover:bg-[#0f766e]'
              : 'border border-[#e2e8f0] text-[#0f172a] hover:border-[#0d9488] hover:text-[#0d9488]'
          }
        `}
        style={{ minHeight: 48 }}
      >
        Empezar prueba gratis
      </button>
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────
function EmployeeRow({
  name,
  role,
  dept,
  hours,
  status,
  avatar,
}: {
  name: string;
  role: string;
  dept: string;
  hours: string;
  status: 'Activo' | 'Permiso';
  avatar: string;
}) {
  return (
    <tr className="border-b border-[#e2e8f0] transition-colors duration-150 hover:bg-[#f8fafc]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ccfbf1] text-sm font-semibold text-[#0d9488]">
            {avatar}
          </div>
          <span className="font-medium text-[#0f172a]">{name}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-[#64748b]">{role}</td>
      <td className="px-5 py-4 text-sm text-[#64748b]">{dept}</td>
      <td className="px-5 py-4 text-sm font-medium text-[#0f172a]">{hours}</td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            status === 'Activo'
              ? 'bg-[#d1fae5] text-[#059669]'
              : 'bg-[#fef3c7] text-[#d97706]'
          }`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function DesignB() {
  const [activeNav, setActiveNav] = useState('Inicio');

  const navItems = [
    { icon: Home, label: 'Inicio' },
    { icon: Fingerprint, label: 'Fichar' },
    { icon: CalendarDays, label: 'Turnos' },
    { icon: Users, label: 'Equipo' },
    { icon: ArrowLeftRight, label: 'Cambios' },
    { icon: CalendarOff, label: 'Ausencias' },
    { icon: BarChart3, label: 'Informes' },
    { icon: Settings, label: 'Ajustes' },
    { icon: CreditCard, label: 'Facturacion' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Section 1: Landing Hero ──────────────────────────────────── */}
      <section className="bg-white">
        {/* Navbar */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d9488]">
              <Clock size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[#0f172a]">Torre Tempo</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-[#64748b] transition-colors hover:text-[#0f172a]">
              Producto
            </a>
            <a href="#" className="text-sm font-medium text-[#64748b] transition-colors hover:text-[#0f172a]">
              Precios
            </a>
            <a href="#" className="text-sm font-medium text-[#64748b] transition-colors hover:text-[#0f172a]">
              Contacto
            </a>
            <button className="rounded-xl border border-[#e2e8f0] px-5 py-2.5 text-sm font-semibold text-[#0f172a] transition-all duration-200 hover:border-[#0d9488] hover:text-[#0d9488]">
              Iniciar sesion
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 text-center">
          <h1
            className="text-5xl font-extrabold leading-tight text-[#0f172a]"
            style={{ lineHeight: 1.2 }}
          >
            Gestiona tu equipo con{' '}
            <span className="text-[#0d9488]">confianza</span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-2xl text-lg text-[#64748b]"
            style={{ lineHeight: 1.6 }}
          >
            Torre Tempo hace simple lo complicado. Control horario, turnos y
            nominas para tu negocio.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              className="flex items-center gap-2 rounded-2xl bg-[#0d9488] px-8 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#0f766e] hover:shadow-md"
              style={{ minHeight: 56 }}
            >
              Empezar gratis
              <ArrowRight size={18} />
            </button>
            <button
              className="flex items-center gap-2 rounded-2xl border-2 border-[#e2e8f0] px-8 py-4 text-base font-semibold text-[#0f172a] transition-all duration-200 hover:border-[#0d9488] hover:text-[#0d9488]"
              style={{ minHeight: 56 }}
            >
              <Play size={18} />
              Ver demostracion
            </button>
          </div>

          {/* Metric cards */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6">
            {[
              { emoji: '\u23F1\uFE0F', text: '2 segundos para fichar' },
              { emoji: '\uD83D\uDCCB', text: '1 minuto para nominas' },
              { emoji: '\u2705', text: '5 minutos para auditoria' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex flex-col items-center gap-3 rounded-2xl bg-[#f8fafc] p-6 transition-shadow duration-200 hover:shadow-sm"
              >
                <span className="text-4xl">{item.emoji}</span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* Trust signal */}
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-[#64748b]">
            <Shield size={16} className="text-[#0d9488]" />
            <span>Mas de 200 empresas confian en nosotros</span>
            <div className="ml-2 flex -space-x-2">
              {['M', 'C', 'A', 'P', 'L'].map((letter) => (
                <div
                  key={letter}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#ccfbf1] text-xs font-semibold text-[#0d9488]"
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Pricing ───────────────────────────────────────── */}
      <section className="bg-[#f8fafc] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-[#0f172a]">
              Precios simples y transparentes
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-[#64748b]" style={{ lineHeight: 1.6 }}>
              Sin sorpresas. Elige el plan que mejor se adapte a tu negocio.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#ccfbf1] px-4 py-1.5 text-xs font-semibold text-[#0d9488]">
              <Star size={14} />
              14 dias de prueba gratis
            </span>
          </div>
          <div className="flex gap-6">
            <PricingCard
              name="Starter"
              price="\u20AC29"
              desc="Hasta 10 empleados"
              features={[
                'Control horario completo',
                'Gestion de turnos basica',
                'Informes mensuales',
                'App movil',
                'Soporte por email',
              ]}
            />
            <PricingCard
              name="Growth"
              price="\u20AC69"
              desc="Hasta 30 empleados"
              highlight
              badge="Popular"
              features={[
                'Todo en Starter',
                'Turnos avanzados y rotaciones',
                'Gestion de ausencias',
                'Exportacion de nominas',
                'API de inspectores ITSS',
                'Soporte prioritario',
              ]}
            />
            <PricingCard
              name="Business"
              price="\u20AC149"
              desc="Empleados ilimitados"
              features={[
                'Todo en Growth',
                'Multi-ubicacion',
                'Cumplimiento automatico',
                'Informes avanzados',
                'Gestor de cuenta dedicado',
                'SLA 99.9% garantizado',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── Section 3: Dashboard Preview ─────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-[#0f172a]">
              Un panel pensado para ti
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-[#64748b]" style={{ lineHeight: 1.6 }}>
              Intuitivo, limpio y facil de usar. Todo lo que necesitas, donde lo esperas.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-md">
            <div className="flex">
              {/* Sidebar */}
              <aside className="flex w-[280px] flex-shrink-0 flex-col border-r border-[#e2e8f0] bg-white">
                {/* Logo */}
                <div className="flex items-center gap-2.5 border-b border-[#e2e8f0] px-5 py-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d9488]">
                    <Clock size={18} className="text-white" />
                  </div>
                  <span className="text-base font-bold text-[#0f172a]">
                    Torre Tempo
                  </span>
                </div>

                {/* Nav */}
                <nav className="flex flex-1 flex-col gap-0.5 py-3">
                  {navItems.map((item) => (
                    <SidebarItem
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      active={activeNav === item.label}
                      onClick={() => setActiveNav(item.label)}
                    />
                  ))}
                </nav>

                {/* User card */}
                <div className="border-t border-[#e2e8f0] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ccfbf1] text-sm font-bold text-[#0d9488]">
                      MG
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#0f172a]">
                        Maria Garcia
                      </span>
                      <span className="text-xs text-[#64748b]">
                        Administradora
                      </span>
                    </div>
                    <ChevronDown size={16} className="ml-auto text-[#94a3b8]" />
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-8 py-4 shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-[#0f172a]">
                      Buenos dias, Maria!
                    </h2>
                    <p className="text-sm text-[#64748b]">
                      Lunes, 17 de febrero 2025
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b] transition-colors hover:text-[#0f172a]">
                      <Search size={18} />
                    </div>
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b] transition-colors hover:text-[#0f172a]">
                      <Bell size={18} />
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white">
                        3
                      </span>
                    </div>
                  </div>
                </header>

                {/* Dashboard body */}
                <div className="bg-[#f8fafc] p-8">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-5">
                    <StatCard
                      label="Empleados activos"
                      value="24"
                      change="+2 este mes"
                      changeType="up"
                      icon={Users}
                    />
                    <StatCard
                      label="Horas esta semana"
                      value="892h"
                      change="+5.2% vs anterior"
                      changeType="up"
                      icon={Clock}
                    />
                    <StatCard
                      label="Tasa de asistencia"
                      value="96.8%"
                      change="Objetivo: 95%"
                      changeType="neutral"
                      icon={UserCheck}
                    />
                    <StatCard
                      label="Incidencias"
                      value="2"
                      change="-3 vs anterior"
                      changeType="up"
                      icon={AlertTriangle}
                    />
                  </div>

                  {/* Quick action */}
                  <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#ccfbf1] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d9488]">
                        <TrendingUp size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">
                          Todo va bien esta semana
                        </p>
                        <p className="text-xs text-[#64748b]">
                          Cumplimiento normativo al 100%. Sin alertas pendientes.
                        </p>
                      </div>
                    </div>
                    <button className="rounded-xl bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f766e]">
                      Ver informe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Data Table ────────────────────────────────────── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0f172a]">Equipo</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Gestiona los miembros de tu equipo
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0f766e]"
              style={{ minHeight: 48 }}
            >
              <Plus size={18} />
              Anadir empleado
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Nombre
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Rol
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Departamento
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Horas esta semana
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                <EmployeeRow
                  name="Maria Garcia"
                  role="Administradora"
                  dept="Direccion"
                  hours="38h 20min"
                  status="Activo"
                  avatar="MG"
                />
                <EmployeeRow
                  name="Carlos Lopez"
                  role="Camarero"
                  dept="Sala"
                  hours="40h 00min"
                  status="Activo"
                  avatar="CL"
                />
                <EmployeeRow
                  name="Ana Martinez"
                  role="Cocinera"
                  dept="Cocina"
                  hours="36h 45min"
                  status="Activo"
                  avatar="AM"
                />
                <EmployeeRow
                  name="Pedro Sanchez"
                  role="Camarero"
                  dept="Terraza"
                  hours="0h 00min"
                  status="Permiso"
                  avatar="PS"
                />
                <EmployeeRow
                  name="Laura Fernandez"
                  role="Recepcionista"
                  dept="Recepcion"
                  hours="39h 15min"
                  status="Activo"
                  avatar="LF"
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Section 5: Form (Create Shift) ───────────────────────────── */}
      <section className="bg-[#f8fafc] px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0f172a]">
                Crear nuevo turno
              </h2>
              <p className="mt-2 text-sm text-[#64748b]" style={{ lineHeight: 1.6 }}>
                Asigna un turno a un miembro de tu equipo. Todos los campos
                marcados con * son obligatorios.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {/* Empleado */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[#0f172a]">
                  Empleado *
                </label>
                <select
                  className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#0f172a] transition-colors focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecciona un empleado...
                  </option>
                  <option>Maria Garcia</option>
                  <option>Carlos Lopez</option>
                  <option>Ana Martinez</option>
                  <option>Pedro Sanchez</option>
                  <option>Laura Fernandez</option>
                </select>
                <span className="text-xs text-[#64748b]">
                  Elige el empleado al que quieres asignar el turno
                </span>
              </div>

              {/* Fecha */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[#0f172a]">
                  Fecha *
                </label>
                <input
                  type="date"
                  className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#0f172a] transition-colors focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                />
                <span className="text-xs text-[#64748b]">
                  Fecha del turno que quieres crear
                </span>
              </div>

              {/* Hora inicio / Hora fin */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#0f172a]">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#0f172a] transition-colors focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                  />
                  <span className="text-xs text-[#64748b]">
                    Hora de comienzo del turno
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#0f172a]">
                    Hora fin *
                  </label>
                  <input
                    type="time"
                    defaultValue="17:00"
                    className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#0f172a] transition-colors focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                  />
                  <span className="text-xs text-[#64748b]">
                    Hora de finalizacion del turno
                  </span>
                </div>
              </div>

              {/* Ubicacion */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[#0f172a]">
                  Ubicacion *
                </label>
                <div className="relative">
                  <MapPin
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                  />
                  <select
                    className="h-12 w-full appearance-none rounded-xl border border-[#e2e8f0] bg-white pl-11 pr-4 text-sm text-[#0f172a] transition-colors focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecciona ubicacion...
                    </option>
                    <option>Restaurante Central - Madrid</option>
                    <option>Terraza Norte - Barcelona</option>
                    <option>Oficina Principal - Valencia</option>
                  </select>
                </div>
                <span className="text-xs text-[#64748b]">
                  Centro de trabajo donde se realizara el turno
                </span>
              </div>

              {/* Notas */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[#0f172a]">
                  Notas
                </label>
                <textarea
                  rows={3}
                  placeholder="Anade instrucciones o notas para el empleado..."
                  className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] transition-colors focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#ccfbf1]"
                />
                <span className="text-xs text-[#64748b]">
                  Opcional. Cualquier indicacion especial para este turno.
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  className="flex items-center justify-center rounded-xl border border-[#e2e8f0] px-6 py-3 text-sm font-semibold text-[#64748b] transition-all duration-200 hover:border-[#94a3b8] hover:text-[#0f172a]"
                  style={{ minHeight: 48 }}
                >
                  Cancelar
                </button>
                <button
                  className="flex items-center justify-center rounded-xl bg-[#0d9488] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0f766e]"
                  style={{ minHeight: 48, minWidth: 160 }}
                >
                  Crear turno
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
