import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Shield,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Calendar,
  Key,
  Check,
  ChevronDown,
  MapPin,
  Smartphone,
  Menu,
  X,
  Zap,
  Users,
  BarChart3,
  WifiOff,
  Timer,
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  employeeLimit: string;
  features: string[];
  modules: string[];
  highlighted?: boolean;
  cta: string;
}

interface FAQ {
  question: string;
  answer: string;
}

// ============================================================================
// DATA
// ============================================================================

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '19',
    period: '/mes',
    description: 'Cumplimiento básico para microempresas',
    employeeLimit: 'Hasta 10 empleados',
    features: [
      'Control de presencia completo',
      'Cumplimiento automático ITSS',
      'API Inspector incluida',
      'App móvil PWA offline',
      'Soporte por email',
    ],
    modules: ['Tempo', 'Inspector Pack'],
    cta: 'Empezar Gratis',
  },
  {
    name: 'Pro',
    price: '49',
    period: '/mes',
    description: 'Planificación y nóminas para pymes',
    employeeLimit: 'Hasta 25 empleados',
    features: [
      'Todo en Starter',
      'Planificación de turnos visual',
      'Exportación directa a gestoría',
      'Validación pre-publicación',
      'Soporte prioritario',
    ],
    modules: ['Tempo', 'Rota', 'Payroll Export', 'Inspector Pack'],
    highlighted: true,
    cta: 'Probar 14 días gratis',
  },
  {
    name: 'Business',
    price: '99',
    period: '/mes',
    description: 'Multi-sede con control centralizado',
    employeeLimit: 'Hasta 75 empleados',
    features: [
      'Todo en Pro',
      'Gestión multi-ubicación',
      'Informes consolidados',
      'Dashboard ejecutivo',
      'Soporte telefónico',
    ],
    modules: ['Tempo', 'Rota', 'Payroll', 'Inspector', 'Multi-Site'],
    cta: 'Probar 14 días gratis',
  },
  {
    name: 'Enterprise',
    price: '249',
    period: '+/mes',
    description: 'Solución completa para grandes organizaciones',
    employeeLimit: 'Empleados ilimitados',
    features: [
      'Todo en Business',
      'Expedientes digitales HR',
      'Firma electrónica integrada',
      'Onboarding automatizado',
      'SLA 99.9% garantizado',
    ],
    modules: ['Todos los módulos'],
    cta: 'Contactar Ventas',
  },
];

const FAQS: FAQ[] = [
  {
    question: '¿Qué requisitos exige la ITSS a las empresas?',
    answer: 'La Inspección de Trabajo exige registro de jornada con descansos mínimos de 12 horas entre turnos, jornadas máximas de 9 horas y límites semanales de 40 horas. Nuestro sistema verifica automáticamente estos requisitos y genera alertas antes de que ocurra cualquier incumplimiento.',
  },
  {
    question: '¿Funciona sin conexión a internet?',
    answer: 'Sí, Torre Tempo es una PWA (Progressive Web App) diseñada para funcionar offline. Ideal para restaurantes y hoteles donde la cobertura puede ser irregular. Los fichajes se almacenan localmente en IndexedDB y se sincronizan automáticamente cuando vuelve la conexión.',
  },
  {
    question: '¿Qué es la cadena de auditoría SHA-256?',
    answer: 'Cada registro genera un hash criptográfico que enlaza con el anterior, creando una cadena inmutable. Si alguien intenta modificar un registro, la cadena se rompe y es detectable. Es el mismo principio que usa blockchain, adaptado para cumplimiento laboral.',
  },
  {
    question: '¿Cómo accede un inspector de trabajo?',
    answer: 'Genera un token temporal de solo lectura desde el panel. El inspector accede vía navegador sin crear cuenta — ve registros, filtros por empleado/fecha, y puede descargar informes PDF con verificación SHA-256. El token expira automáticamente.',
  },
  {
    question: '¿Cómo se integra con mi gestoría?',
    answer: 'El módulo Payroll Export genera archivos CSV/XML compatibles con A3, Sage, Nominaplus y otros sistemas de gestión de nóminas. Tu gestoría puede importar directamente los datos sin requerir entrada manual.',
  },
  {
    question: '¿Cuánto tarda la configuración inicial?',
    answer: 'Menos de 5 minutos. Crea tu cuenta, añade tu primera ubicación con geofencing, invita a tu equipo por email, y ya están listos para fichar. El onboarding guiado acompaña a cada nuevo empleado en su primer fichaje.',
  },
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// ============================================================================
// NAVBAR
// ============================================================================

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-header"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-none">Torre Tempo</span>
              <span className="text-[10px] text-neutral-400 leading-none">by LSLT Apps</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm text-neutral-400 hover:text-white transition-colors">Cómo Funciona</a>
            <a href="#funciones" className="text-sm text-neutral-400 hover:text-white transition-colors">Funciones</a>
            <a href="#precios" className="text-sm text-neutral-400 hover:text-white transition-colors">Precios</a>
            <a href="#faq" className="text-sm text-neutral-400 hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth/signin">Iniciar Sesión</Link>
            </Button>
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link to="/auth/signup">Empezar Gratis</Link>
            </Button>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-neutral-400 hover:text-white">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-neutral-900/95 backdrop-blur-lg"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#como-funciona" onClick={() => setIsOpen(false)} className="block py-2 text-neutral-300 hover:text-white">Cómo Funciona</a>
              <a href="#funciones" onClick={() => setIsOpen(false)} className="block py-2 text-neutral-300 hover:text-white">Funciones</a>
              <a href="#precios" onClick={() => setIsOpen(false)} className="block py-2 text-neutral-300 hover:text-white">Precios</a>
              <a href="#faq" onClick={() => setIsOpen(false)} className="block py-2 text-neutral-300 hover:text-white">FAQ</a>
              <div className="pt-4 flex flex-col gap-2">
                <Button variant="outline" asChild className="w-full"><Link to="/auth/signin">Iniciar Sesión</Link></Button>
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600"><Link to="/auth/signup">Empezar Gratis</Link></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ============================================================================
// HERO
// ============================================================================

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-neutral-950">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
          >
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Inspector-Ready | ITSS Compliant</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight tracking-tight"
          >
            Fichaje en 2 Segundos.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Inspección en 5 Minutos.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed"
          >
            Control horario diseñado para hostelería en España.
            <br className="hidden sm:block" />
            Cumplimiento automático • Offline-first • Auditoría inmutable SHA-256
          </motion.p>

          {/* Speed Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto"
          >
            {[
              { before: '45 seg', after: '2 seg', label: 'Fichaje' },
              { before: '45 min', after: '1 min', label: 'Nómina' },
              { before: '2 horas', after: '5 min', label: 'Auditoría' },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="text-xs text-neutral-600 line-through mb-1">{metric.before}</div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{metric.after}</div>
                <div className="text-xs sm:text-sm text-neutral-400 mt-1">{metric.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            >
              <Link to="/auth/signup">
                Empezar Gratis — 14 días
                <CheckCircle2 className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-auto px-8 py-6 text-lg rounded-xl border-white/20 hover:bg-white/5"
            >
              <a href="#como-funciona">
                Ver Cómo Funciona
                <ChevronDown className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12 flex flex-col items-center"
          >
            <p className="text-sm text-neutral-500 mb-4">Sin tarjeta de crédito • Configuración en 5 minutos</p>
            <div className="flex flex-wrap justify-center items-center gap-6 text-neutral-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="text-xs sm:text-sm">SHA-256 Audit</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-emerald-500" />
                <span className="text-xs sm:text-sm">Offline-First</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-xs sm:text-sm">ITSS Ready</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-2.5 rounded-full bg-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS — PERSONA-DRIVEN FLOWS
// ============================================================================

function FlowsSection() {
  const flows = [
    {
      persona: 'María',
      role: 'Empleada / Camarera',
      color: 'emerald',
      icon: Smartphone,
      tagline: 'Ficha en 2 segundos y olvídate',
      steps: [
        { icon: MapPin, text: 'Llega al restaurante — geofence detecta su ubicación' },
        { icon: Zap, text: 'Tap en el botón verde "FICHAR" — 2 segundos' },
        { icon: Timer, text: 'Medio turno: tap "PAUSA" → temporizador de 15 min' },
        { icon: CheckCircle2, text: 'Fin de turno: tap "SALIDA" → ve sus horas del día' },
        { icon: ArrowLeftRight, text: 'Intercambio de turno digital — sin WhatsApp' },
      ],
    },
    {
      persona: 'Carlos',
      role: 'Manager / Jefe de turno',
      color: 'blue',
      icon: Users,
      tagline: 'Control en tiempo real de todo tu equipo',
      steps: [
        { icon: Users, text: 'Dashboard en vivo — puntos verdes = fichados, grises = pendientes' },
        { icon: CheckCircle2, text: 'Aprueba correcciones deslizando — sin papeles' },
        { icon: Calendar, text: 'Arrastra y suelta turnos — el sistema bloquea incumplimientos' },
        { icon: AlertTriangle, text: 'Alertas automáticas: horas extras, descansos incumplidos' },
        { icon: FileText, text: '"Generar nómina" → PDF listo en 1 minuto' },
      ],
    },
    {
      persona: 'Laura',
      role: 'HR / Administradora de nóminas',
      color: 'purple',
      icon: BarChart3,
      tagline: 'De 6 horas a 10 segundos',
      steps: [
        { icon: TrendingUp, text: 'Dashboard multi-sede — 5 ubicaciones, 1 pantalla' },
        { icon: AlertTriangle, text: 'Panel de cumplimiento — incumplimientos en rojo' },
        { icon: FileText, text: '"Exportar CSV" → formato Sage-compatible en 10 segundos' },
        { icon: ShieldCheck, text: 'Informes mensuales con cadena de auditoría SHA-256' },
        { icon: Users, text: 'Onboarding digital — nuevos empleados configurados en minutos' },
      ],
    },
    {
      persona: 'Carmen',
      role: 'Inspectora ITSS',
      color: 'amber',
      icon: ShieldCheck,
      tagline: 'Acceso instantáneo. Datos inmutables.',
      steps: [
        { icon: Key, text: 'Token temporal de solo lectura — sin crear cuenta' },
        { icon: FileText, text: 'Filtra por empleado, fecha, ubicación' },
        { icon: Shield, text: 'Verificación SHA-256 en cada registro' },
        { icon: FileText, text: 'Descarga PDF de cumplimiento en 30 segundos' },
        { icon: Clock, text: '7 años de registros inmutables disponibles al instante' },
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'bg-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'bg-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'bg-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'bg-amber-500/20' },
  };

  return (
    <section id="como-funciona" className="relative py-24 bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Cómo Funciona
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Cada Rol, su Flujo Perfecto
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Diseñado para las personas reales que lo usan cada día — desde la camarera hasta el inspector.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-6"
        >
          {flows.map((flow) => {
            const c = colorMap[flow.color]!;
            return (
              <motion.div
                key={flow.persona}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className={cn('rounded-2xl border p-6 lg:p-8', c.bg, c.border)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', c.icon)}>
                    <flow.icon className={cn('h-6 w-6', c.text)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{flow.persona}</h3>
                    <p className="text-sm text-neutral-400">{flow.role}</p>
                  </div>
                </div>
                <p className={cn('text-sm font-medium mb-5', c.text)}>{flow.tagline}</p>
                <div className="space-y-3">
                  {flow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 mt-0.5">
                        <step.icon className="h-3.5 w-3.5 text-neutral-400" />
                      </div>
                      <p className="text-sm text-neutral-300 leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES — BEFORE/AFTER + MODULES
// ============================================================================

function FeaturesSection() {
  const features = [
    {
      icon: Smartphone,
      title: '5 Métodos de Fichaje',
      description: 'Tap móvil, NFC badge, código QR, PIN, y geofencing automático. El empleado elige, el sistema registra.',
      highlights: ['Tap móvil', 'NFC Badge', 'QR Code', 'PIN', 'Geofencing'],
    },
    {
      icon: WifiOff,
      title: 'Offline-First',
      description: 'Funciona sin internet. Los fichajes se guardan en IndexedDB y se sincronizan automáticamente al reconectar.',
      highlights: ['IndexedDB', 'Auto-sync', 'Sin pérdida de datos', 'PWA nativa'],
    },
    {
      icon: Calendar,
      title: 'Planificador Visual de Turnos',
      description: 'Drag-and-drop con validación en tiempo real. El sistema bloquea turnos que violan la normativa laboral.',
      highlights: ['Drag & drop', 'Validación ITSS', 'Turnos abiertos', 'Auto-publicación'],
    },
    {
      icon: Shield,
      title: 'Cadena de Auditoría SHA-256',
      description: 'Cada registro genera un hash criptográfico enlazado — inmutable y verificable por inspectores de trabajo.',
      highlights: ['Inmutable', 'Verificable', '7 años', 'Hash chain'],
    },
    {
      icon: FileText,
      title: 'Exportación a Gestoría',
      description: 'Un clic genera CSV/XML compatible con A3, Sage, Nominaplus. De 6 horas de Excel a 10 segundos.',
      highlights: ['CSV/XML', 'A3/Sage', 'Nominaplus', '1-click export'],
    },
    {
      icon: ShieldCheck,
      title: 'API Inspector ITSS',
      description: 'Token temporal de solo lectura para inspecciones. Sin crear cuentas, sin complicaciones. Acceso y verificación al instante.',
      highlights: ['Token temporal', 'Solo lectura', 'Sin cuenta', 'PDF export'],
    },
  ];

  return (
    <section id="funciones" className="relative py-24 bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-950 to-neutral-900/50" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
            <CheckCircle2 className="h-4 w-4" />
            Funciones
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Todo lo que Necesitas. Nada que No.
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Cada módulo resuelve un requisito específico de la normativa laboral española.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="group glass-card p-6 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <feature.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-neutral-400 text-sm mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((h) => (
                  <span key={h} className="text-xs px-2 py-1 rounded-md bg-white/5 text-neutral-300 border border-white/5">
                    {h}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Before/After Comparison */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 lg:p-10"
        >
          <h3 className="text-xl font-bold text-white mb-6 text-center">Antes vs Después de Torre Tempo</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { before: 'Papel y Excel', after: 'Digital + inmutable', label: 'Registros' },
              { before: 'WhatsApp caótico', after: 'Solicitudes en-app', label: 'Intercambios' },
              { before: 'Excel manual 6h', after: 'CSV export 10 seg', label: 'Nómina' },
              { before: 'Multas sorpresa', after: 'Alertas preventivas', label: 'Cumplimiento' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-xs text-red-400/80 line-through mb-1">{item.before}</p>
                <ArrowRight className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-emerald-400">{item.after}</p>
                <p className="text-xs text-neutral-500 mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING
// ============================================================================

function PricingSection() {
  return (
    <section id="precios" className="relative py-24 bg-neutral-950">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
            Precios Transparentes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Planes para cada tamaño de empresa
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Sin sorpresas. Sin contratos largos. Cancela cuando quieras.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.name}
              variants={scaleIn}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                'relative rounded-2xl p-5 lg:p-6 transition-all duration-300 hover:scale-[1.02]',
                tier.highlighted
                  ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/10'
                  : 'glass-card'
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium shadow-lg shadow-emerald-500/30">
                    Más Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">&euro;{tier.price}</span>
                  <span className="text-neutral-400 text-sm">{tier.period}</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium mt-1">{tier.employeeLimit}</p>
                <p className="text-xs text-neutral-500 mt-1">{tier.description}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs text-neutral-500 mb-2">Módulos incluidos:</p>
                <div className="flex flex-wrap gap-1">
                  {tier.modules.map((mod) => (
                    <span key={mod} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {mod}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-neutral-300 text-xs">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="sm"
                className={cn(
                  'w-full',
                  tier.highlighted
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                )}
              >
                <Link to="/auth/signup">{tier.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-neutral-400 flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            Garantía de devolución de 30 días. Sin preguntas.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// TESTIMONIALS
// ============================================================================

function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'Desde que implementamos el sistema, las inspecciones de trabajo son un trámite. Tenemos todo documentado y accesible en segundos.',
      author: 'María García',
      role: 'Directora de RRHH',
      company: 'Hostelería Mediterránea SL',
      avatar: 'MG',
    },
    {
      quote: 'Antes perdíamos horas cada mes preparando informes para la gestoría. Ahora exportamos directamente en su formato y nos centramos en el equipo.',
      author: 'Carlos Ruiz',
      role: 'Gerente de Operaciones',
      company: 'Cadena Hotelera Costa del Sol',
      avatar: 'CR',
    },
    {
      quote: 'La función offline es clave para nuestros locales. Fichan aunque no haya cobertura y se sincroniza automáticamente. Cumplimiento garantizado.',
      author: 'Ana Martínez',
      role: 'CEO',
      company: 'Grupo Restauración Mediterráneo',
      avatar: 'AM',
    },
  ];

  return (
    <section className="relative py-24 bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-950 to-neutral-900/50" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
            Testimonios
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Empresas que duermen tranquilas
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div key={t.author} variants={fadeInUp} transition={{ duration: 0.5 }} className="glass-card p-6">
              <svg className="h-8 w-8 text-emerald-500/30 mb-4" fill="currentColor" viewBox="0 0 32 32">
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>
              <p className="text-neutral-300 leading-relaxed mb-6">{t.quote}</p>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-white">{t.author}</p>
                  <p className="text-sm text-neutral-400">{t.role} • {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ
// ============================================================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-24 bg-neutral-950">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">FAQ</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Preguntas Frecuentes</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="space-y-4"
        >
          {FAQS.map((faq, index) => (
            <motion.div key={faq.question} variants={fadeInUp} transition={{ duration: 0.3 }} className="glass-card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-medium text-white pr-4">{faq.question}</span>
                <ChevronDown className={cn('h-5 w-5 text-neutral-400 shrink-0 transition-transform duration-300', openIndex === index && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-neutral-400 leading-relaxed">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-neutral-400 mb-4">¿No encuentras lo que buscas?</p>
          <Button variant="outline" asChild>
            <a href="mailto:soporte@lsltgroup.es">Contactar Soporte</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

function CTASection() {
  return (
    <section className="relative py-24 bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-emerald-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} transition={{ duration: 0.5 }}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            ¿Listo para simplificar tu registro horario?
          </h2>
          <p className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto">
            Únete a restaurantes, hoteles y bares que ya confían en Torre Tempo para su cumplimiento legal.
          </p>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25"
          >
            <Link to="/auth/signup">
              Empezar Ahora — Es Gratis
              <CheckCircle2 className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-sm text-neutral-500">14 días gratis • Sin tarjeta de crédito • Configuración en 5 minutos</p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer className="relative bg-neutral-950 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white leading-none">Torre Tempo</span>
                <span className="text-[10px] text-neutral-400 leading-none">by LSLT Apps</span>
              </div>
            </Link>
            <p className="text-sm text-neutral-400 mb-4">
              El sistema de registro horario que los inspectores aman.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Producto</h4>
            <ul className="space-y-3">
              <li><a href="#funciones" className="text-sm text-neutral-400 hover:text-white transition-colors">Funciones</a></li>
              <li><a href="#precios" className="text-sm text-neutral-400 hover:text-white transition-colors">Precios</a></li>
              <li><a href="#como-funciona" className="text-sm text-neutral-400 hover:text-white transition-colors">Cómo Funciona</a></li>
              <li><a href="#faq" className="text-sm text-neutral-400 hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Recursos</h4>
            <ul className="space-y-3">
              <li><a href="mailto:soporte@lsltgroup.es" className="text-sm text-neutral-400 hover:text-white transition-colors">Soporte</a></li>
              <li><Link to="/auth/signin" className="text-sm text-neutral-400 hover:text-white transition-colors">Iniciar Sesión</Link></li>
              <li><Link to="/auth/signup" className="text-sm text-neutral-400 hover:text-white transition-colors">Registrarse</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Privacidad</a></li>
              <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Términos</a></li>
              <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Cookies</a></li>
              <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-xs text-neutral-500 text-center">
            Torre Tempo es un producto de <span className="text-neutral-400">LSLT Apps</span>,
            <br className="sm:hidden" /> una división de <span className="text-neutral-400">Lakeside La Torre (Murcia) Group SL</span>.
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">&copy; 2026 LSLT Apps. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main>
        <HeroSection />
        <FlowsSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
