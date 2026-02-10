import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Shield,
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
  Fingerprint,
  QrCode,
  Globe,
  Play,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface PersonaFlow {
  id: string;
  persona: string;
  role: string;
  icon: LucideIcon;
  tagline: string;
  steps: Array<{ icon: LucideIcon; title: string; detail: string }>;
}

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  span: 'large' | 'small';
  tags: string[];
}

interface PricingTier {
  name: string;
  price: string;
  annualPrice: string;
  unit: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// ============================================================================
// DATA
// ============================================================================

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Como Funciona' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'FAQ' },
] as const;

const SPEED_METRICS = [
  { before: '45s', after: '2s', label: 'Fichaje', icon: Timer },
  { before: '45 min', after: '1 min', label: 'Nomina', icon: FileText },
  { before: '2 horas', after: '5 min', label: 'Auditoria', icon: Shield },
] as const;

const PERSONA_FLOWS: PersonaFlow[] = [
  {
    id: 'maria',
    persona: 'Maria',
    role: 'Empleada / Camarera',
    icon: Smartphone,
    tagline: 'Ficha en 2 segundos desde su movil y consulta su horario en el autobus.',
    steps: [
      { icon: MapPin, title: 'Geofence activo', detail: 'Llega al restaurante y el sistema detecta su ubicacion automaticamente' },
      { icon: Zap, title: 'Tap FICHAR', detail: 'Un solo toque en el boton verde. 2 segundos. Hecho.' },
      { icon: Timer, title: 'Pausa registrada', detail: 'A medio turno pulsa PAUSA y el temporizador de descanso arranca' },
      { icon: Clock, title: 'Salida limpia', detail: 'Fin de turno: tap SALIDA y ve su resumen de horas del dia' },
      { icon: ArrowLeftRight, title: 'Intercambio digital', detail: 'Solicita cambio de turno desde la app, sin mensajes de WhatsApp' },
    ],
  },
  {
    id: 'carlos',
    persona: 'Carlos',
    role: 'Manager / Jefe de turno',
    icon: Users,
    tagline: 'Aprueba intercambios, controla asistencia en vivo y monta el cuadrante en minutos.',
    steps: [
      { icon: Users, title: 'Asistencia en vivo', detail: 'Dashboard con puntos verdes (fichados) y grises (pendientes) en tiempo real' },
      { icon: Check, title: 'Aprobacion rapida', detail: 'Desliza para aprobar correcciones e intercambios sin papeleos' },
      { icon: Calendar, title: 'Cuadrante visual', detail: 'Arrastra y suelta turnos. El sistema bloquea asignaciones que incumplen la ley' },
      { icon: AlertTriangle, title: 'Alertas preventivas', detail: 'Aviso automatico de horas extras y descansos no cumplidos' },
      { icon: FileText, title: 'Nomina en 1 clic', detail: 'Genera el informe de horas listo para la gestoria en formato compatible' },
    ],
  },
  {
    id: 'laura',
    persona: 'Laura',
    role: 'HR / Administradora',
    icon: BarChart3,
    tagline: 'Genera informes de nomina en segundos y verifica el cumplimiento de toda la plantilla.',
    steps: [
      { icon: TrendingUp, title: 'Vista multi-sede', detail: 'Dashboard consolidado: 5 ubicaciones en una sola pantalla' },
      { icon: AlertTriangle, title: 'Panel de cumplimiento', detail: 'Incumplimientos en rojo, advertencias en amarillo, todo en verde al instante' },
      { icon: FileText, title: 'Export a gestoria', detail: 'CSV compatible con A3, Sage y Nominaplus generado en 10 segundos' },
      { icon: ShieldCheck, title: 'Auditoria SHA-256', detail: 'Cada informe mensual incluye cadena de verificacion criptografica' },
      { icon: Users, title: 'Onboarding digital', detail: 'Nuevos empleados configurados y fichando en menos de 5 minutos' },
    ],
  },
  {
    id: 'carmen',
    persona: 'Carmen',
    role: 'Inspectora ITSS',
    icon: ShieldCheck,
    tagline: 'Acceso instantaneo con token temporal. Datos inmutables y verificables.',
    steps: [
      { icon: Key, title: 'Token temporal', detail: 'Recibe un enlace de solo lectura sin necesidad de crear cuenta' },
      { icon: FileText, title: 'Filtros avanzados', detail: 'Filtra por empleado, rango de fechas o ubicacion especifica' },
      { icon: Shield, title: 'Verificacion SHA-256', detail: 'Cada registro muestra su hash criptografico enlazado al anterior' },
      { icon: FileText, title: 'PDF de cumplimiento', detail: 'Descarga informe verificable con toda la cadena de auditoria' },
      { icon: Clock, title: '7 anos de historial', detail: 'Registros inmutables disponibles al instante segun normativa' },
    ],
  },
];

const FEATURES: Feature[] = [
  {
    icon: Fingerprint,
    title: '5 Metodos de Fichaje',
    description: 'Tap movil, NFC badge, codigo QR, PIN numerico y geofencing automatico. El empleado elige el metodo, el sistema registra con precision.',
    span: 'large',
    tags: ['Tap movil', 'NFC', 'QR Code', 'PIN', 'Geofencing'],
  },
  {
    icon: WifiOff,
    title: 'Offline-First PWA',
    description: 'Funciona sin internet. Fichajes en IndexedDB con sincronizacion automatica al reconectar. Ideal para locales con cobertura irregular.',
    span: 'large',
    tags: ['IndexedDB', 'Auto-sync', 'PWA nativa'],
  },
  {
    icon: Calendar,
    title: 'Cuadrante Visual',
    description: 'Drag-and-drop con validacion de normativa laboral en tiempo real. Bloquea asignaciones que violan descansos o jornada maxima.',
    span: 'small',
    tags: ['Drag & drop', 'Validacion ITSS'],
  },
  {
    icon: Shield,
    title: 'Auditoria SHA-256',
    description: 'Cada registro genera un hash criptografico enlazado al anterior. Cadena inmutable verificable por inspectores.',
    span: 'small',
    tags: ['Inmutable', 'Hash chain'],
  },
  {
    icon: FileText,
    title: 'Export a Gestoria',
    description: 'CSV/XML compatible con A3, Sage y Nominaplus. De horas de Excel manual a 10 segundos con un clic.',
    span: 'small',
    tags: ['CSV/XML', 'A3/Sage'],
  },
  {
    icon: QrCode,
    title: 'API Inspector ITSS',
    description: 'Token temporal de solo lectura para inspecciones. Sin cuentas, sin complicaciones. Acceso y verificacion al instante.',
    span: 'small',
    tags: ['Token temporal', 'Solo lectura'],
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Basico',
    price: '2,50',
    annualPrice: '2,00',
    unit: '/usuario/mes',
    description: 'Fichaje y cumplimiento para equipos pequenos.',
    features: [
      'Control de presencia completo',
      'Cumplimiento automatico ITSS',
      'App movil PWA offline',
      'Soporte por email',
      'Hasta 15 empleados',
    ],
    cta: 'Empezar Gratis',
    ctaLink: '/auth/signup',
  },
  {
    name: 'Profesional',
    price: '4,50',
    annualPrice: '3,60',
    unit: '/usuario/mes',
    description: 'Planificacion, nominas y multi-sede.',
    features: [
      'Todo en Basico',
      'Planificador visual de turnos',
      'Exportacion a gestoria',
      'API Inspector ITSS',
      'Soporte prioritario',
      'Empleados ilimitados',
    ],
    highlighted: true,
    cta: 'Probar 14 dias gratis',
    ctaLink: '/auth/signup',
  },
  {
    name: 'Enterprise',
    price: 'A medida',
    annualPrice: 'A medida',
    unit: '',
    description: 'SLA dedicado para grandes organizaciones.',
    features: [
      'Todo en Profesional',
      'SSO y provisioning',
      'SLA 99.9% garantizado',
      'Manager de cuenta dedicado',
      'Formacion personalizada',
      'Integraciones a medida',
    ],
    cta: 'Contactar Ventas',
    ctaLink: 'mailto:ventas@lsltgroup.es',
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Hay prueba gratuita?',
    answer: 'Si. Todos los planes incluyen 14 dias de prueba gratuita sin necesidad de tarjeta de credito. Al terminar el periodo puedes elegir un plan o tu cuenta se pausa sin perder datos.',
  },
  {
    question: 'Cumple con la normativa laboral espanola?',
    answer: 'Torre Tempo verifica automaticamente el Estatuto de los Trabajadores: jornada maxima de 9h/dia, 40h/semana, descanso minimo de 12h entre turnos y pausa de 15 minutos tras 6h continuas. Las alertas saltan antes de que ocurra cualquier incumplimiento.',
  },
  {
    question: 'Funciona sin conexion a internet?',
    answer: 'Si. Torre Tempo es una PWA disenada para funcionar offline. Los fichajes se almacenan localmente en IndexedDB y se sincronizan automaticamente cuando vuelve la conexion. Ideal para restaurantes y hoteles con cobertura irregular.',
  },
  {
    question: 'Como se protegen los datos?',
    answer: 'Los datos personales sensibles (DNI, numero de Seguridad Social) se cifran con AES-256-GCM a nivel de aplicacion. Cada registro de jornada genera un hash SHA-256 encadenado que garantiza la inmutabilidad. Cumplimos con el RGPD y la LOPDGDD.',
  },
  {
    question: 'Puedo migrar desde otro sistema?',
    answer: 'Si. Ofrecemos importacion de datos desde CSV y asistencia personalizada durante la migracion. El equipo de soporte configura tu cuenta y verifica que todo funcione correctamente antes del primer dia operativo.',
  },
  {
    question: 'Que tipo de soporte ofreceis?',
    answer: 'El plan Basico incluye soporte por email en horario laboral. El plan Profesional anade soporte prioritario con tiempos de respuesta inferiores a 4 horas. Enterprise incluye un manager de cuenta dedicado y soporte telefonico.',
  },
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

// ============================================================================
// NAVBAR
// ============================================================================

function Navbar(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll(): void {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'glass-header shadow-lg shadow-black/20'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-lg shadow-primary-500/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white leading-none tracking-tight">
                Torre Tempo
              </span>
              <span className="text-[10px] text-neutral-500 leading-none">
                by LSLT Apps
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-neutral-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth/signin">Iniciar Sesion</Link>
            </Button>
            <Button asChild>
              <Link to="/auth/signup">Empezar Gratis</Link>
            </Button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
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
            transition={{ duration: 0.25 }}
            className="md:hidden border-t border-white/[0.06] bg-surface-0/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-2.5 px-3 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-2 border-t border-white/[0.06]">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth/signin">Iniciar Sesion</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth/signup">Empezar Gratis</Link>
                </Button>
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

function HeroSection(): JSX.Element {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background layers */}
      <div className="absolute inset-0 bg-surface-0">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-500/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-primary-400/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8"
          >
            <ShieldCheck className="h-4 w-4 text-primary-400" />
            <span className="text-sm text-primary-300 font-medium">
              Cumplimiento ITSS automatico
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight"
          >
            Fichaje en{' '}
            <span className="bg-gradient-to-r from-primary-400 via-primary-300 to-primary-400 bg-clip-text text-transparent">
              2 Segundos
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed"
          >
            Control horario disenado para hosteleria en Espana.
            Cumplimiento automatico, offline-first, auditoria inmutable SHA-256.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto gradient-primary hover:opacity-90 text-white px-8 py-6 text-base rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
            >
              <Link to="/auth/signup">
                Empezar Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-auto px-8 py-6 text-base rounded-xl border-white/10 hover:bg-white/[0.04]"
            >
              <a href="#como-funciona">
                <Play className="mr-2 h-4 w-4" />
                Ver Demo
              </a>
            </Button>
          </motion.div>

          {/* Speed Metric Cards */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {SPEED_METRICS.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="glass-card p-5 text-center group hover:bg-white/[0.06] transition-all duration-300"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <metric.icon className="h-4 w-4 text-primary-400" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-neutral-600 line-through">
                    {metric.before}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-600" />
                  <span className="text-2xl font-bold text-primary-400">
                    {metric.after}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust signals */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 text-sm text-neutral-500"
          >
            Sin tarjeta de credito &middot; Configuracion en 5 minutos &middot; Cancela cuando quieras
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border-2 border-white/10 flex items-start justify-center p-2"
        >
          <div className="w-1 h-2.5 rounded-full bg-white/30" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================================================
// PERSONA FLOWS (interactive tabs)
// ============================================================================

function PersonaFlowsSection(): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFlow = PERSONA_FLOWS[activeIndex]!;

  const personaColors: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
    maria: { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'bg-emerald-500/15 border-emerald-500/20' },
    carlos: { ring: 'ring-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'bg-blue-500/15 border-blue-500/20' },
    laura: { ring: 'ring-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'bg-purple-500/15 border-purple-500/20' },
    carmen: { ring: 'ring-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'bg-amber-500/15 border-amber-500/20' },
  };

  const colors = personaColors[activeFlow.id]!;

  return (
    <section id="como-funciona" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 via-surface-1 to-surface-0" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            <Zap className="h-3.5 w-3.5" />
            Como Funciona
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Cada Rol, su Flujo Perfecto
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Desde la camarera que ficha hasta la inspectora que audita,
            cada persona tiene exactamente lo que necesita.
          </p>
        </motion.div>

        {/* Persona Tabs */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12"
        >
          {PERSONA_FLOWS.map((flow, index) => {
            const isActive = index === activeIndex;
            const tabColors = personaColors[flow.id]!;
            return (
              <button
                key={flow.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? cn('glass-card ring-2 text-white', tabColors.ring, tabColors.bg)
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <flow.icon className={cn('h-4 w-4', isActive ? tabColors.text : 'text-neutral-500')} />
                <span>{flow.persona}</span>
                <span className="hidden sm:inline text-xs text-neutral-500">
                  {flow.role}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Active Flow Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFlow.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="glass-card p-6 sm:p-8 lg:p-10"
          >
            {/* Flow header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b border-white/[0.06]">
              <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border', colors.icon)}>
                <activeFlow.icon className={cn('h-7 w-7', colors.text)} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{activeFlow.persona}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400">
                    {activeFlow.role}
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">{activeFlow.tagline}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="grid gap-4 sm:gap-5">
              {activeFlow.steps.map((step, stepIndex) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: stepIndex * 0.07 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200',
                      colors.icon,
                      'group-hover:bg-white/[0.08]'
                    )}>
                      <step.icon className={cn('h-4.5 w-4.5', colors.text)} />
                    </div>
                    {stepIndex < activeFlow.steps.length - 1 && (
                      <div className="w-px h-4 sm:h-5 bg-white/[0.06] mt-1" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-white">
                      <span className={cn('mr-2 text-xs font-mono', colors.text)}>
                        {String(stepIndex + 1).padStart(2, '0')}
                      </span>
                      {step.title}
                    </p>
                    <p className="text-sm text-neutral-400 mt-0.5 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES (bento grid)
// ============================================================================

function FeaturesSection(): JSX.Element {
  return (
    <section id="funciones" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-surface-0" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            <Zap className="h-3.5 w-3.5" />
            Funciones
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Todo lo que Necesitas
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Cada modulo resuelve un requisito especifico de la normativa laboral espanola.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className={cn(
                'glass-card p-6 group hover:bg-white/[0.06] transition-all duration-300',
                feature.span === 'large' ? 'lg:col-span-2' : 'lg:col-span-1'
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/20 mb-4 group-hover:bg-primary-500/15 transition-colors duration-200">
                <feature.icon className="h-5 w-5 text-primary-400" />
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-4">
                {feature.description}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] text-neutral-400 border border-white/[0.06]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING
// ============================================================================

function PricingSection(): JSX.Element {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="precios" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 via-surface-1 to-surface-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary-500/8 rounded-full blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            Precios Transparentes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Planes para Cada Equipo
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Sin sorpresas, sin contratos largos. Cancela cuando quieras.
          </p>
        </motion.div>

        {/* Monthly / Annual toggle */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span className={cn('text-sm transition-colors', !isAnnual ? 'text-white font-medium' : 'text-neutral-500')}>
            Mensual
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              'relative w-12 h-7 rounded-full transition-colors duration-200',
              isAnnual ? 'bg-primary-600' : 'bg-white/10'
            )}
            aria-label="Cambiar facturacion"
          >
            <motion.div
              animate={{ x: isAnnual ? 22 : 3 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
            />
          </button>
          <span className={cn('text-sm transition-colors', isAnnual ? 'text-white font-medium' : 'text-neutral-500')}>
            Anual
          </span>
          {isAnnual && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
              -20%
            </span>
          )}
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto"
        >
          {PRICING_TIERS.map((tier, index) => {
            const displayPrice = isAnnual ? tier.annualPrice : tier.price;
            const isCustom = tier.price === 'A medida';

            return (
              <motion.div
                key={tier.name}
                variants={scaleIn}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={cn(
                  'relative rounded-2xl p-6 lg:p-7 transition-all duration-300',
                  tier.highlighted
                    ? 'bg-gradient-to-b from-primary-500/15 to-primary-500/5 border-2 border-primary-500/30 shadow-xl shadow-primary-500/10'
                    : 'glass-card hover:bg-white/[0.06]'
                )}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full gradient-primary text-white text-xs font-semibold shadow-lg shadow-primary-500/30">
                      Recomendado
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    {isCustom ? (
                      <span className="text-2xl font-bold text-white">A medida</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">
                          &euro;{displayPrice}
                        </span>
                        <span className="text-neutral-500 text-sm">{tier.unit}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-primary-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={cn(
                    'w-full',
                    tier.highlighted
                      ? 'gradient-primary hover:opacity-90 text-white'
                      : 'bg-white/[0.06] hover:bg-white/10 text-white border border-white/[0.08]'
                  )}
                >
                  {tier.ctaLink.startsWith('mailto:') ? (
                    <a href={tier.ctaLink}>{tier.cta}</a>
                  ) : (
                    <Link to={tier.ctaLink}>{tier.cta}</Link>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center text-sm text-neutral-500 flex items-center justify-center gap-2"
        >
          <Shield className="h-4 w-4 text-primary-400" />
          14 dias de prueba gratuita en todos los planes. Sin tarjeta de credito.
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ
// ============================================================================

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left group"
      >
        <span className="font-medium text-white pr-4 group-hover:text-primary-300 transition-colors">
          {item.question}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-neutral-500 shrink-0 transition-transform duration-300',
            isOpen && 'rotate-180 text-primary-400'
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-neutral-400 leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection(): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-surface-0" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Preguntas Frecuentes
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
          className="space-y-3"
        >
          {FAQ_ITEMS.map((item, index) => (
            <motion.div key={item.question} variants={fadeInUp} transition={{ duration: 0.3 }}>
              <AccordionItem
                item={item}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <p className="text-neutral-500 mb-4 text-sm">No encuentras tu respuesta?</p>
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

function CTASection(): JSX.Element {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 to-surface-1" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/[0.06] via-primary-500/[0.03] to-primary-500/[0.06]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary-500/10 rounded-full blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
            Listo para simplificar
            <br />
            tu registro horario?
          </h2>
          <p className="text-lg text-neutral-400 mb-10 max-w-xl mx-auto">
            Unete a los restaurantes, hoteles y bares que ya confian en Torre Tempo para su cumplimiento legal.
          </p>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto gradient-primary hover:opacity-90 text-white px-10 py-6 text-base rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
          >
            <Link to="/auth/signup">
              Empezar Ahora — Es Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-sm text-neutral-500">
            14 dias gratis &middot; Sin tarjeta de credito &middot; Configuracion en 5 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer(): JSX.Element {
  const footerColumns = [
    {
      title: 'Producto',
      links: [
        { label: 'Funciones', href: '#funciones' },
        { label: 'Precios', href: '#precios' },
        { label: 'Como Funciona', href: '#como-funciona' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { label: 'Sobre Nosotros', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Soporte', href: 'mailto:soporte@lsltgroup.es' },
        { label: 'Contacto', href: 'mailto:info@lsltgroup.es' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacidad', href: '#' },
        { label: 'Terminos', href: '#' },
        { label: 'Cookies', href: '#' },
        { label: 'RGPD', href: '#' },
      ],
    },
    {
      title: 'Contacto',
      links: [
        { label: 'soporte@lsltgroup.es', href: 'mailto:soporte@lsltgroup.es' },
        { label: 'ventas@lsltgroup.es', href: 'mailto:ventas@lsltgroup.es' },
      ],
    },
  ];

  return (
    <footer className="relative bg-surface-0 border-t border-white/[0.05]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white leading-none tracking-tight">
                  Torre Tempo
                </span>
                <span className="text-[10px] text-neutral-500 leading-none">
                  by LSLT Apps
                </span>
              </div>
            </Link>
            <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
              Control horario que los inspectores aman y los empleados no odian.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Globe className="h-3.5 w-3.5" />
              <span>Hecho en Espana</span>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-white text-sm mb-4">{column.title}</h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') || link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} LSLT Apps — Una division de Lakeside La Torre (Murcia) Group SL
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/auth/signin"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Iniciar Sesion
            </Link>
            <Link
              to="/auth/signup"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Landing(): JSX.Element {
  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main>
        <HeroSection />
        <PersonaFlowsSection />
        <FeaturesSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
