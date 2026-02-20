import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { cn } from '@/lib/utils';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

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

interface PricingPlan {
  name: string;
  code: string;
  price: string;
  period: string;
  description: string;
  employees: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

// ============================================================================
// DATA
// ============================================================================

function usePersonaFlows(): PersonaFlow[] {
  const { t } = useTranslation();
  return [
    {
      id: 'maria',
      persona: t('landing.personas.maria.name'),
      role: t('landing.personas.maria.role'),
      icon: Smartphone,
      tagline: t('landing.personas.maria.tagline'),
      steps: [
        { icon: MapPin, title: t('landing.personas.maria.steps.0.title'), detail: t('landing.personas.maria.steps.0.detail') },
        { icon: Zap, title: t('landing.personas.maria.steps.1.title'), detail: t('landing.personas.maria.steps.1.detail') },
        { icon: Timer, title: t('landing.personas.maria.steps.2.title'), detail: t('landing.personas.maria.steps.2.detail') },
        { icon: Clock, title: t('landing.personas.maria.steps.3.title'), detail: t('landing.personas.maria.steps.3.detail') },
        { icon: ArrowLeftRight, title: t('landing.personas.maria.steps.4.title'), detail: t('landing.personas.maria.steps.4.detail') },
      ],
    },
    {
      id: 'carlos',
      persona: t('landing.personas.carlos.name'),
      role: t('landing.personas.carlos.role'),
      icon: Users,
      tagline: t('landing.personas.carlos.tagline'),
      steps: [
        { icon: Users, title: t('landing.personas.carlos.steps.0.title'), detail: t('landing.personas.carlos.steps.0.detail') },
        { icon: Check, title: t('landing.personas.carlos.steps.1.title'), detail: t('landing.personas.carlos.steps.1.detail') },
        { icon: Calendar, title: t('landing.personas.carlos.steps.2.title'), detail: t('landing.personas.carlos.steps.2.detail') },
        { icon: AlertTriangle, title: t('landing.personas.carlos.steps.3.title'), detail: t('landing.personas.carlos.steps.3.detail') },
        { icon: FileText, title: t('landing.personas.carlos.steps.4.title'), detail: t('landing.personas.carlos.steps.4.detail') },
      ],
    },
    {
      id: 'laura',
      persona: t('landing.personas.laura.name'),
      role: t('landing.personas.laura.role'),
      icon: BarChart3,
      tagline: t('landing.personas.laura.tagline'),
      steps: [
        { icon: TrendingUp, title: t('landing.personas.laura.steps.0.title'), detail: t('landing.personas.laura.steps.0.detail') },
        { icon: AlertTriangle, title: t('landing.personas.laura.steps.1.title'), detail: t('landing.personas.laura.steps.1.detail') },
        { icon: FileText, title: t('landing.personas.laura.steps.2.title'), detail: t('landing.personas.laura.steps.2.detail') },
        { icon: ShieldCheck, title: t('landing.personas.laura.steps.3.title'), detail: t('landing.personas.laura.steps.3.detail') },
        { icon: Users, title: t('landing.personas.laura.steps.4.title'), detail: t('landing.personas.laura.steps.4.detail') },
      ],
    },
    {
      id: 'carmen',
      persona: t('landing.personas.carmen.name'),
      role: t('landing.personas.carmen.role'),
      icon: ShieldCheck,
      tagline: t('landing.personas.carmen.tagline'),
      steps: [
        { icon: Key, title: t('landing.personas.carmen.steps.0.title'), detail: t('landing.personas.carmen.steps.0.detail') },
        { icon: FileText, title: t('landing.personas.carmen.steps.1.title'), detail: t('landing.personas.carmen.steps.1.detail') },
        { icon: Shield, title: t('landing.personas.carmen.steps.2.title'), detail: t('landing.personas.carmen.steps.2.detail') },
        { icon: FileText, title: t('landing.personas.carmen.steps.3.title'), detail: t('landing.personas.carmen.steps.3.detail') },
        { icon: Clock, title: t('landing.personas.carmen.steps.4.title'), detail: t('landing.personas.carmen.steps.4.detail') },
      ],
    },
  ];
}

function usePricingPlans(): PricingPlan[] {
  const { t } = useTranslation();

  const i18nPlans = t('landing.pricing.plans', { returnObjects: true });
  if (Array.isArray(i18nPlans) && i18nPlans.length === 3) {
    return i18nPlans as PricingPlan[];
  }

  return [
    {
      name: 'Starter',
      code: 'starter',
      price: '29',
      period: '/mes',
      description: t('landing.pricing.starterDesc', { defaultValue: 'Para equipos pequenos que empiezan con el control horario digital.' }),
      employees: t('landing.pricing.upTo10', { defaultValue: 'Hasta 10 empleados' }),
      features: [
        t('landing.pricing.feat.roster', { defaultValue: 'Cuadrantes de turnos' }),
        t('landing.pricing.feat.timeclock', { defaultValue: 'Fichaje digital' }),
        t('landing.pricing.feat.compliance', { defaultValue: 'Cumplimiento normativo' }),
        t('landing.pricing.feat.reports', { defaultValue: 'Informes basicos' }),
        t('landing.pricing.feat.leave', { defaultValue: 'Gestion de ausencias' }),
        t('landing.pricing.feat.employees10', { defaultValue: 'Hasta 10 empleados' }),
      ],
      cta: t('landing.pricing.trialCta', { defaultValue: 'Empezar prueba gratis' }),
      highlighted: false,
    },
    {
      name: 'Growth',
      code: 'growth',
      price: '69',
      period: '/mes',
      description: t('landing.pricing.growthDesc', { defaultValue: 'Para empresas en crecimiento que necesitan mas control.' }),
      employees: t('landing.pricing.upTo30', { defaultValue: 'Hasta 30 empleados' }),
      features: [
        t('landing.pricing.feat.allStarter', { defaultValue: 'Todo en Starter' }),
        t('landing.pricing.feat.openShifts', { defaultValue: 'Turnos abiertos' }),
        t('landing.pricing.feat.shiftSwaps', { defaultValue: 'Intercambios de turno' }),
        t('landing.pricing.feat.geofencing', { defaultValue: 'Geofencing' }),
        t('landing.pricing.feat.templates', { defaultValue: 'Plantillas de turnos' }),
        t('landing.pricing.feat.employees30', { defaultValue: 'Hasta 30 empleados' }),
      ],
      cta: t('landing.pricing.trialCta', { defaultValue: 'Empezar prueba gratis' }),
      highlighted: true,
    },
    {
      name: 'Business',
      code: 'business',
      price: '149',
      period: '/mes',
      description: t('landing.pricing.businessDesc', { defaultValue: 'Para empresas consolidadas con necesidades avanzadas.' }),
      employees: t('landing.pricing.unlimited', { defaultValue: 'Empleados ilimitados' }),
      features: [
        t('landing.pricing.feat.allGrowth', { defaultValue: 'Todo en Growth' }),
        t('landing.pricing.feat.inspectorApi', { defaultValue: 'API de inspector ITSS' }),
        t('landing.pricing.feat.advancedReports', { defaultValue: 'Informes avanzados' }),
        t('landing.pricing.feat.payrollExport', { defaultValue: 'Exportacion de nominas' }),
        t('landing.pricing.feat.prioritySupport', { defaultValue: 'Soporte prioritario' }),
        t('landing.pricing.feat.unlimitedEmployees', { defaultValue: 'Empleados ilimitados' }),
      ],
      cta: t('landing.pricing.trialCta', { defaultValue: 'Empezar prueba gratis' }),
      highlighted: false,
    },
  ];
}

// ============================================================================
// NAVBAR
// ============================================================================

function Navbar(): JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const NAV_LINKS = [
    { href: '#como-funciona', label: t('landing.nav.howItWorks') },
    { href: '#funciones', label: t('landing.nav.features') },
    { href: '#precios', label: t('landing.nav.pricing') },
    { href: '#faq', label: t('landing.nav.faq') },
  ];

  useEffect(() => {
    function handleScroll(): void {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-kresna-border'
          : 'bg-white'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none tracking-tight text-charcoal">
                Torre Tempo
              </span>
              <span className="text-[10px] leading-none text-kresna-gray">
                {t('landing.brandSubtitle')}
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-kresna-gray-dark hover:text-charcoal transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" asChild>
              <Link to="/auth/signin">{t('auth.signIn')}</Link>
            </Button>
            <Button asChild>
              <Link to="/auth/signup">{t('landing.cta.startFree')}</Link>
            </Button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-kresna-gray-dark hover:text-charcoal transition-colors"
            aria-label={t('landing.nav.menu')}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-kresna-border bg-white">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block py-2.5 px-3 rounded-xl text-kresna-gray-dark hover:text-charcoal hover:bg-kresna-light transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-2 border-t border-kresna-border">
              <Button variant="outline" asChild className="w-full">
                <Link to="/auth/signin">{t('auth.signIn')}</Link>
              </Button>
              <Button asChild className="w-full">
                <Link to="/auth/signup">{t('landing.cta.startFree')}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ============================================================================
// HERO
// ============================================================================

function HeroSection(): JSX.Element {
  const { t } = useTranslation();

  const SPEED_METRICS = [
    { before: '45s', after: '2s', label: t('landing.metrics.clockIn'), icon: Timer },
    { before: '45 min', after: '1 min', label: t('landing.metrics.payroll'), icon: FileText },
    { before: '2h', after: '5 min', label: t('landing.metrics.audit'), icon: Shield },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 bg-white overflow-hidden">
      {/* Subtle decorative gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary-50 blur-[160px] opacity-60" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Badge */}
          <motion.div variants={fadeInUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 mb-8">
              <Zap className="h-4 w-4 text-primary-500" />
              <span className="text-sm text-primary-600 font-medium">
                14 {t('landing.hero.trialBadge', { defaultValue: 'dias de prueba gratis' })}
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
          >
            <span className="text-charcoal">{t('landing.hero.title1')}</span>{' '}
            <span className="text-primary-500">
              {t('landing.hero.title2')}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mt-6 text-lg sm:text-xl text-kresna-gray-dark max-w-2xl mx-auto leading-relaxed"
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              asChild
              size="xl"
              className="w-full sm:w-auto"
            >
              <Link to="/auth/signup">
                {t('landing.cta.startFree')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-auto"
            >
              <a href="#como-funciona">
                <Play className="mr-2 h-4 w-4" />
                {t('landing.cta.seeDemo')}
              </a>
            </Button>
          </motion.div>

          {/* Speed Metric Cards */}
          <motion.div
            variants={fadeInUp}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {SPEED_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-kresna-border bg-white p-5 text-center shadow-card"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <metric.icon className="h-4 w-4 text-primary-500" />
                  <span className="text-xs font-medium text-kresna-gray uppercase tracking-wider">
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-kresna-gray line-through">{metric.before}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-kresna-border" />
                  <span className="text-2xl font-bold text-primary-500">
                    {metric.after}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Trust signals */}
          <motion.p variants={fadeInUp} className="mt-10 text-sm text-kresna-gray">
            {t('landing.hero.trustSignals')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PERSONA FLOWS
// ============================================================================

function PersonaFlowsSection(): JSX.Element {
  const { t } = useTranslation();
  const personaFlows = usePersonaFlows();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFlow = personaFlows[activeIndex]!;

  const personaColors: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
    maria: { ring: 'ring-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-50 border-emerald-200' },
    carlos: { ring: 'ring-primary-400', bg: 'bg-primary-50', text: 'text-primary-600', icon: 'bg-primary-50 border-primary-200' },
    laura: { ring: 'ring-rose-400', bg: 'bg-rose-50', text: 'text-rose-600', icon: 'bg-rose-50 border-rose-200' },
    carmen: { ring: 'ring-amber-400', bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-50 border-amber-200' },
  };

  const colors = personaColors[activeFlow.id]!;

  return (
    <section id="como-funciona" className="relative py-24 sm:py-32 bg-kresna-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4"
          >
            <Zap className="h-3.5 w-3.5" />
            {t('landing.nav.howItWorks')}
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal mb-4 tracking-tight"
          >
            {t('landing.personas.title')}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-kresna-gray-dark max-w-2xl mx-auto">
            {t('landing.personas.subtitle')}
          </motion.p>
        </motion.div>

        {/* Persona Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          {personaFlows.map((flow, index) => {
            const isActive = index === activeIndex;
            const tabColors = personaColors[flow.id]!;
            return (
              <button
                key={flow.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? cn('ring-2 bg-white shadow-card text-charcoal', tabColors.ring, tabColors.bg)
                    : 'text-kresna-gray-dark hover:text-charcoal hover:bg-white/60'
                )}
              >
                <flow.icon className={cn('h-4 w-4', isActive ? tabColors.text : 'text-kresna-gray')} />
                <span>{flow.persona}</span>
                <span className="hidden sm:inline text-xs text-kresna-gray">{flow.role}</span>
              </button>
            );
          })}
        </div>

        {/* Active Flow Content */}
        <motion.div
          key={activeFlow.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-kresna-border bg-white p-6 sm:p-8 lg:p-10 shadow-card"
        >
          {/* Flow header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b border-kresna-border">
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border', colors.icon)}>
              <activeFlow.icon className={cn('h-7 w-7', colors.text)} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-charcoal">{activeFlow.persona}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-kresna-light text-kresna-gray-dark">
                  {activeFlow.role}
                </span>
              </div>
              <p className="text-kresna-gray-dark mt-1">{activeFlow.tagline}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="grid gap-4 sm:gap-5">
            {activeFlow.steps.map((step, stepIndex) => (
              <div key={step.title} className="flex items-start gap-4 group">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200',
                    colors.icon,
                    'group-hover:shadow-sm'
                  )}>
                    <step.icon className={cn('h-4 w-4', colors.text)} />
                  </div>
                  {stepIndex < activeFlow.steps.length - 1 && (
                    <div className="w-px h-4 sm:h-5 bg-kresna-border mt-1" />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold text-charcoal">
                    <span className={cn('mr-2 text-xs font-mono', colors.text)}>
                      {String(stepIndex + 1).padStart(2, '0')}
                    </span>
                    {step.title}
                  </p>
                  <p className="text-sm text-kresna-gray-dark mt-0.5 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURES
// ============================================================================

function FeaturesSection(): JSX.Element {
  const { t } = useTranslation();

  const FEATURES = [
    { icon: Fingerprint, title: t('landing.features.items.clockMethods.title'), description: t('landing.features.items.clockMethods.description'), span: 'large' as const, tags: [t('landing.features.items.clockMethods.tags.tap'), 'NFC', 'QR Code', 'PIN', 'Geofencing'] },
    { icon: WifiOff, title: t('landing.features.items.offlinePwa.title'), description: t('landing.features.items.offlinePwa.description'), span: 'large' as const, tags: ['IndexedDB', t('landing.features.items.offlinePwa.tags.autoSync'), t('landing.features.items.offlinePwa.tags.nativePwa')] },
    { icon: Calendar, title: t('landing.features.items.visualRoster.title'), description: t('landing.features.items.visualRoster.description'), span: 'small' as const, tags: ['Drag & drop', t('landing.features.items.visualRoster.tags.itssValidation')] },
    { icon: Shield, title: t('landing.features.items.audit.title'), description: t('landing.features.items.audit.description'), span: 'small' as const, tags: [t('landing.features.items.audit.tags.immutable'), t('landing.features.items.audit.tags.hashChain')] },
    { icon: FileText, title: t('landing.features.items.export.title'), description: t('landing.features.items.export.description'), span: 'small' as const, tags: ['CSV/XML', 'A3/Sage'] },
    { icon: QrCode, title: t('landing.features.items.inspector.title'), description: t('landing.features.items.inspector.description'), span: 'small' as const, tags: [t('landing.features.items.inspector.tags.temporaryToken'), t('landing.features.items.inspector.tags.readOnly')] },
  ];

  return (
    <section id="funciones" className="relative py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4"
          >
            <Zap className="h-3.5 w-3.5" />
            {t('landing.nav.features')}
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal mb-4 tracking-tight"
          >
            {t('landing.features.title')}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-kresna-gray-dark max-w-2xl mx-auto">
            {t('landing.features.subtitle')}
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className={cn(
                'group rounded-3xl border border-kresna-border bg-white p-6 shadow-card transition-all duration-300 hover:shadow-kresna hover:border-primary-200',
                feature.span === 'large' ? 'lg:col-span-2' : 'lg:col-span-1'
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 border border-primary-100 mb-4 transition-shadow duration-300">
                <feature.icon className="h-5 w-5 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-2">{feature.title}</h3>
              <p className="text-sm text-kresna-gray-dark leading-relaxed mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-lg bg-kresna-light text-kresna-gray-dark border border-kresna-border">
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
  const { t } = useTranslation();
  const plans = usePricingPlans();

  return (
    <section id="precios" className="relative py-24 sm:py-32 bg-kresna-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4">
              {t('landing.pricing.badge')}
            </span>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal mb-4 tracking-tight"
          >
            {t('landing.pricing.title')}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-kresna-gray-dark max-w-2xl mx-auto">
            {t('landing.pricing.subtitle')}
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 text-sm font-medium">
              <Zap className="h-3.5 w-3.5" />
              14 {t('landing.pricing.trialDays', { defaultValue: 'dias de prueba gratis en todos los planes' })}
            </span>
          </motion.div>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.code}
              variants={fadeInUp}
              className={cn(
                'relative rounded-3xl p-6 lg:p-7 transition-all duration-300',
                plan.highlighted
                  ? 'bg-white border-2 border-primary-500 shadow-kresna-lg scale-[1.02] lg:scale-105'
                  : 'border border-kresna-border bg-white shadow-card hover:shadow-kresna'
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-primary-500 text-white text-xs font-semibold shadow-md">
                    {t('billing.recommended')}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-charcoal mb-1">{plan.name}</h3>
                <p className="text-sm text-kresna-gray-dark mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-charcoal">&euro;{plan.price}</span>
                  <span className="text-kresna-gray text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-primary-500 font-medium mt-2">{plan.employees}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className={cn(
                      'h-4 w-4 shrink-0 mt-0.5',
                      plan.highlighted ? 'text-primary-500' : 'text-kresna-gray-medium'
                    )} />
                    <span className="text-sm text-kresna-gray-dark">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                <Button asChild className="w-full">
                  <Link to="/auth/signup">{plan.cta}</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth/signup">{plan.cta}</Link>
                </Button>
              )}
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-10 text-center text-sm text-kresna-gray flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-primary-500" />
          {t('landing.pricing.trialNote')}
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ
// ============================================================================

function FAQSection(): JSX.Element {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData = t('landing.faqItems', { returnObjects: true }) as Array<{ q: string; a: string }>;
  const items = Array.isArray(faqData) ? faqData : [];

  return (
    <section id="faq" className="relative py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4"
          >
            {t('landing.nav.faq')}
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal mb-4 tracking-tight"
          >
            {t('landing.faq.title')}
          </motion.h2>
        </motion.div>

        <motion.div
          className="space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {items.map((item, index) => (
            <motion.div
              key={item.q}
              variants={fadeInUp}
              className="rounded-2xl border border-kresna-border bg-white overflow-hidden shadow-card"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left group"
              >
                <span className="font-medium text-charcoal pr-4 group-hover:text-primary-500 transition-colors">
                  {item.q}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-kresna-gray shrink-0 transition-transform duration-300',
                    openIndex === index && 'rotate-180 text-primary-500'
                  )}
                />
              </button>
              {openIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-kresna-gray-dark leading-relaxed"
                >
                  {item.a}
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 text-center">
          <p className="text-kresna-gray mb-4 text-sm">{t('landing.faq.moreQuestions')}</p>
          <Button variant="outline" asChild>
            <a href="mailto:soporte@lsltgroup.es">{t('landing.faq.contactSupport')}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

function CTASection(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 sm:py-32 bg-primary-50 overflow-hidden">
      {/* Subtle decorative gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-100 blur-[120px] opacity-50" />

      <motion.div
        className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={staggerContainer}
      >
        <motion.h2
          variants={fadeInUp}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal mb-6 tracking-tight"
        >
          {t('landing.cta.readyTitle')}
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="text-lg text-kresna-gray-dark mb-10 max-w-xl mx-auto"
        >
          {t('landing.cta.readySubtitle')}
        </motion.p>
        <motion.div variants={fadeInUp}>
          <Button
            asChild
            size="xl"
            className="w-full sm:w-auto"
          >
            <Link to="/auth/signup">
              {t('landing.cta.startNow')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
        <motion.p variants={fadeInUp} className="mt-6 text-sm text-kresna-gray">
          {t('landing.hero.trustSignals')}
        </motion.p>
      </motion.div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer(): JSX.Element {
  const { t } = useTranslation();

  const footerColumns = [
    {
      title: t('landing.footer.product'),
      links: [
        { label: t('landing.nav.features'), href: '#funciones' },
        { label: t('landing.nav.pricing'), href: '#precios' },
        { label: t('landing.nav.howItWorks'), href: '#como-funciona' },
        { label: t('landing.nav.faq'), href: '#faq' },
      ],
    },
    {
      title: t('landing.footer.company'),
      links: [
        { label: t('landing.footer.aboutUs'), href: '#' },
        { label: t('landing.footer.support'), href: 'mailto:soporte@lsltgroup.es' },
        { label: t('landing.footer.contact'), href: 'mailto:info@lsltgroup.es' },
      ],
    },
    {
      title: t('landing.footer.legal'),
      links: [
        { label: t('landing.footer.privacy'), href: '#' },
        { label: t('landing.footer.terms'), href: '#' },
        { label: t('landing.footer.gdpr'), href: '#' },
      ],
    },
  ];

  return (
    <footer className="border-t border-kresna-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-charcoal leading-none tracking-tight">
                  Torre Tempo
                </span>
                <span className="text-[10px] text-kresna-gray leading-none">
                  {t('landing.brandSubtitle')}
                </span>
              </div>
            </Link>
            <p className="text-sm text-kresna-gray-dark mb-4 leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-kresna-gray">
              <Globe className="h-3.5 w-3.5" />
              <span>{t('landing.footer.madeIn')}</span>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-charcoal text-sm mb-4">{column.title}</h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') || link.href.startsWith('#') ? (
                      <a href={link.href} className="text-sm text-kresna-gray-dark hover:text-charcoal transition-colors duration-200">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-kresna-gray-dark hover:text-charcoal transition-colors duration-200">
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
        <div className="mt-12 pt-8 border-t border-kresna-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-kresna-gray">
            &copy; {new Date().getFullYear()} {t('landing.footer.copyright')}
          </p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/auth/signin" className="text-xs text-kresna-gray-dark hover:text-charcoal transition-colors">
              {t('auth.signIn')}
            </Link>
            <Link to="/auth/signup" className="text-xs text-kresna-gray-dark hover:text-charcoal transition-colors">
              {t('auth.signUp')}
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
    <div className="min-h-screen bg-white text-charcoal">
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
