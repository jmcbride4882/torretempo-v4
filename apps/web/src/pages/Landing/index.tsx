import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Star,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════════════════════
   Torre Tempo Landing Page — Kresna Redesign

   Design system: Kresna Framer AI template
   - 56-64px hero headings, -0.04em tracking
   - 80px section padding, 24-32px card padding
   - Multi-layer shadows, frosted glass, 24px radius
   - Stagger children animations, cubic-bezier(.44,0,.56,1)
   - Dark footer, device mockup in hero, annual/monthly pricing toggle
   ══════════════════════════════════════════════════════════════════════════════ */

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.44, 0, 0.56, 1] },
  },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.44, 0, 0.56, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.44, 0, 0.56, 1] },
  },
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
// DATA HOOKS (unchanged logic, same i18n keys)
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
// SECTION WRAPPER — Consistent Kresna spacing
// ============================================================================

function Section({
  children,
  id,
  className,
  dark,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        'relative py-20 sm:py-28 lg:py-32',
        dark ? 'bg-charcoal text-white' : '',
        className
      )}
    >
      <div className="mx-auto max-w-kresna px-5 sm:px-8 lg:px-10">
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// SECTION HEADER — Reusable heading block
// ============================================================================

function SectionHeader({
  badge,
  badgeIcon,
  title,
  subtitle,
  dark,
}: {
  badge?: string;
  badgeIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      className="text-center mb-16 lg:mb-20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={staggerContainer}
    >
      {badge && (
        <motion.div variants={fadeInUp} className="mb-5">
          <span
            className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium',
              dark
                ? 'bg-white/10 text-white/80 border border-white/10'
                : 'bg-primary-50 text-primary-600 border border-primary-100'
            )}
          >
            {badgeIcon}
            {badge}
          </span>
        </motion.div>
      )}
      <motion.h2
        variants={fadeInUp}
        className={cn(
          'text-3xl sm:text-4xl lg:text-display font-bold tracking-display leading-tight',
          dark ? 'text-white' : 'text-charcoal'
        )}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeInUp}
          className={cn(
            'mt-5 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed',
            dark ? 'text-white/60' : 'text-kresna-gray-dark'
          )}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

// ============================================================================
// NAVBAR — Sticky white, logo left, nav center, CTA right
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
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-kresna',
        scrolled
          ? 'bg-white/85 backdrop-blur-xl shadow-kresna border-b border-kresna-border/50'
          : 'bg-white'
      )}
    >
      <div className="mx-auto max-w-kresna px-5 sm:px-8 lg:px-10">
        <div className="flex h-[72px] items-center justify-between">
          {/* Logo — left */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-kresna-btn transition-transform duration-300 group-hover:scale-105">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none tracking-tight text-charcoal">
                Torre Tempo
              </span>
              <span className="text-[10px] leading-none text-kresna-gray mt-0.5">
                {t('landing.brandSubtitle')}
              </span>
            </div>
          </Link>

          {/* Nav links — center (desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-kresna-gray-dark hover:text-charcoal rounded-xl hover:bg-kresna-light transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side — CTA + lang */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" asChild className="text-kresna-gray-dark hover:text-charcoal">
              <Link to="/auth/signin">{t('auth.signIn')}</Link>
            </Button>
            <Button asChild className="shadow-kresna-btn">
              <Link to="/auth/signup">
                {t('landing.cta.startFree')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-2xl text-kresna-gray-dark hover:text-charcoal hover:bg-kresna-light transition-colors min-h-touch"
            aria-label={t('landing.nav.menu')}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.44, 0, 0.56, 1] }}
            className="lg:hidden border-t border-kresna-border bg-white overflow-hidden"
          >
            <div className="px-5 py-5 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 px-4 rounded-2xl text-body-sm font-medium text-kresna-gray-dark hover:text-charcoal hover:bg-kresna-light transition-colors min-h-touch"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-5 flex flex-col gap-3 border-t border-kresna-border mt-2">
                <LanguageSwitcher />
                <Button variant="outline" size="touch" asChild className="w-full">
                  <Link to="/auth/signin">{t('auth.signIn')}</Link>
                </Button>
                <Button size="touch" asChild className="w-full shadow-kresna-btn">
                  <Link to="/auth/signup">{t('landing.cta.startFree')}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ============================================================================
// HERO — Split layout: text left, device mockup right
// ============================================================================

function HeroSection(): JSX.Element {
  const { t } = useTranslation();

  const SPEED_METRICS = [
    { before: '45s', after: '2s', label: t('landing.metrics.clockIn'), icon: Timer },
    { before: '45 min', after: '1 min', label: t('landing.metrics.payroll'), icon: FileText },
    { before: '2h', after: '5 min', label: t('landing.metrics.audit'), icon: Shield },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-[72px] bg-white overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-primary-50 blur-[200px] opacity-50" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary-100 blur-[160px] opacity-30" />

      <div className="relative z-10 mx-auto max-w-kresna px-5 sm:px-8 lg:px-10 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100 mb-8">
                <Sparkles className="h-4 w-4 text-primary-500" />
                <span className="text-sm text-primary-600 font-medium">
                  14 {t('landing.hero.trialBadge', { defaultValue: 'dias de prueba gratis' })}
                </span>
              </div>
            </motion.div>

            {/* Headline — Kresna 56-64px */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-[56px] xl:text-display font-bold leading-[1.08] tracking-display"
            >
              <span className="text-charcoal">{t('landing.hero.title1')}</span>{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {t('landing.hero.title2')}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-lg sm:text-xl text-kresna-gray-dark leading-relaxed max-w-lg"
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              <Button
                asChild
                size="touch-lg"
                variant="gradient"
                className="w-full sm:w-auto shadow-kresna-btn text-base"
              >
                <Link to="/auth/signup">
                  {t('landing.cta.startFree')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="touch"
                asChild
                className="w-full sm:w-auto"
              >
                <a href="#como-funciona">
                  <Play className="mr-2 h-4 w-4" />
                  {t('landing.cta.seeDemo')}
                </a>
              </Button>
            </motion.div>

            {/* Trust signals */}
            <motion.div variants={fadeInUp} className="mt-8 flex items-center gap-4 flex-wrap">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 border-2 border-white flex items-center justify-center"
                  >
                    <span className="text-[10px] font-bold text-primary-600">
                      {String.fromCharCode(64 + i)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-kresna-gray mt-0.5">
                  {t('landing.hero.trustSignals')}
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — Device mockup frame */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInRight}
            className="relative hidden lg:block"
          >
            {/* Phone frame */}
            <div className="relative mx-auto w-[320px]">
              <div className="rounded-[40px] border-[8px] border-charcoal bg-white shadow-kresna-lg overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 py-2 bg-white">
                  <span className="text-[10px] font-semibold text-charcoal">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-kresna-gray-medium" />
                    <div className="h-2.5 w-2.5 rounded-full bg-kresna-gray-medium" />
                    <div className="h-2.5 w-4 rounded-sm bg-kresna-gray-medium" />
                  </div>
                </div>

                {/* App content mockup */}
                <div className="px-5 pb-6">
                  {/* Header */}
                  <div className="flex items-center justify-between py-3 mb-4">
                    <div>
                      <p className="text-[10px] text-kresna-gray">Buenos días</p>
                      <p className="text-sm font-bold text-charcoal">María García</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-white">M</span>
                    </div>
                  </div>

                  {/* Giant clock-in button */}
                  <div className="flex flex-col items-center py-6">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary-500 animate-pulse opacity-20 scale-125" />
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                        <Clock className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-semibold text-charcoal">Fichar entrada</p>
                    <p className="text-[10px] text-kresna-gray mt-0.5">Turno: 08:00 - 16:00</p>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { label: 'Hoy', value: '0h 0m' },
                      { label: 'Semana', value: '24h 30m' },
                      { label: 'Horas extra', value: '0h' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl bg-kresna-light p-2.5 text-center">
                        <p className="text-[9px] text-kresna-gray uppercase tracking-wider">{stat.label}</p>
                        <p className="text-xs font-bold text-charcoal mt-0.5">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating cards around phone */}
              <motion.div
                initial={{ opacity: 0, x: 20, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -right-16 top-20 rounded-2xl bg-white border border-kresna-border shadow-kresna px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-charcoal">12 fichados</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="absolute -left-12 bottom-32 rounded-2xl bg-white border border-kresna-border shadow-kresna px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-charcoal">ITSS OK</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Speed Metric Cards — full width below hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mt-16 lg:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
        >
          {SPEED_METRICS.map((metric) => (
            <motion.div
              key={metric.label}
              variants={fadeInUp}
              className="rounded-3xl border border-kresna-border bg-white p-6 sm:p-7 text-center shadow-card hover:shadow-kresna transition-shadow duration-300"
            >
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 border border-primary-100">
                  <metric.icon className="h-4 w-4 text-primary-500" />
                </div>
                <span className="text-xs font-semibold text-kresna-gray uppercase tracking-wider">
                  {metric.label}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-base text-kresna-gray line-through">{metric.before}</span>
                <ArrowRight className="h-4 w-4 text-kresna-border" />
                <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {metric.after}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PERSONA FLOWS — Tab switcher with animated workflow cards
// ============================================================================

function PersonaFlowsSection(): JSX.Element {
  const { t } = useTranslation();
  const personaFlows = usePersonaFlows();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFlow = personaFlows[activeIndex]!;

  const personaColors: Record<string, { ring: string; bg: string; text: string; iconBg: string; stepBg: string; gradient: string }> = {
    maria: { ring: 'ring-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-50', stepBg: 'bg-emerald-50/50', gradient: 'from-emerald-500 to-emerald-400' },
    carlos: { ring: 'ring-primary-400', bg: 'bg-primary-50', text: 'text-primary-600', iconBg: 'bg-primary-50', stepBg: 'bg-primary-50/50', gradient: 'from-primary-500 to-primary-400' },
    laura: { ring: 'ring-rose-400', bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-50', stepBg: 'bg-rose-50/50', gradient: 'from-rose-500 to-rose-400' },
    carmen: { ring: 'ring-amber-400', bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-50', stepBg: 'bg-amber-50/50', gradient: 'from-amber-500 to-amber-400' },
  };

  const colors = personaColors[activeFlow.id]!;

  return (
    <Section id="como-funciona" className="bg-kresna-light">
      <SectionHeader
        badge={t('landing.nav.howItWorks')}
        badgeIcon={<Zap className="h-3.5 w-3.5" />}
        title={t('landing.personas.title')}
        subtitle={t('landing.personas.subtitle')}
      />

      {/* Persona Tabs — pill style */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 lg:mb-16">
        {personaFlows.map((flow, index) => {
          const isActive = index === activeIndex;
          const tabColors = personaColors[flow.id]!;
          return (
            <button
              key={flow.id}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-kresna min-h-touch',
                isActive
                  ? cn('ring-2 bg-white shadow-kresna text-charcoal', tabColors.ring)
                  : 'text-kresna-gray-dark hover:text-charcoal hover:bg-white/80 hover:shadow-card'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                isActive ? tabColors.iconBg : 'bg-kresna-light'
              )}>
                <flow.icon className={cn('h-4 w-4', isActive ? tabColors.text : 'text-kresna-gray')} />
              </div>
              <div className="text-left">
                <span className="block">{flow.persona}</span>
                <span className="block text-[10px] text-kresna-gray font-normal">{flow.role}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Flow Content — Two column: info left, steps right */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFlow.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.44, 0, 0.56, 1] }}
          className="rounded-3xl border border-kresna-border bg-white shadow-kresna overflow-hidden"
        >
          <div className="grid lg:grid-cols-5">
            {/* Left — persona info panel */}
            <div className={cn('lg:col-span-2 p-8 lg:p-10', colors.stepBg)}>
              <div className={cn('flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br shadow-lg mb-6', colors.gradient)}>
                <activeFlow.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-charcoal mb-2">{activeFlow.persona}</h3>
              <span className="inline-flex px-3 py-1 rounded-full bg-white/80 text-xs font-medium text-kresna-gray-dark mb-4">
                {activeFlow.role}
              </span>
              <p className="text-kresna-gray-dark leading-relaxed">{activeFlow.tagline}</p>
              <div className="mt-8">
                <Button asChild size="touch" variant="gradient" className="w-full lg:w-auto shadow-kresna-btn">
                  <Link to="/auth/signup">
                    {t('landing.cta.startFree')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right — steps */}
            <div className="lg:col-span-3 p-8 lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-kresna-gray mb-6">
                {t('landing.nav.howItWorks')}
              </p>
              <div className="space-y-1">
                {activeFlow.steps.map((step, stepIndex) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: stepIndex * 0.08, duration: 0.3 }}
                    className="group flex items-start gap-4 rounded-2xl p-4 hover:bg-kresna-light/50 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200',
                        colors.iconBg,
                        'border-transparent group-hover:shadow-sm'
                      )}>
                        <step.icon className={cn('h-5 w-5', colors.text)} />
                      </div>
                      {stepIndex < activeFlow.steps.length - 1 && (
                        <div className="w-px h-5 bg-kresna-border mt-1.5" />
                      )}
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] font-mono font-bold', colors.text)}>
                          {String(stepIndex + 1).padStart(2, '0')}
                        </span>
                        <p className="text-sm font-semibold text-charcoal">{step.title}</p>
                      </div>
                      <p className="text-sm text-kresna-gray-dark mt-1 leading-relaxed">{step.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}

// ============================================================================
// FEATURES — 2 large + 4 small bento grid with hover lift
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
    <Section id="funciones" className="bg-white">
      <SectionHeader
        badge={t('landing.nav.features')}
        badgeIcon={<Sparkles className="h-3.5 w-3.5" />}
        title={t('landing.features.title')}
        subtitle={t('landing.features.subtitle')}
      />

      {/* Bento Grid: 2 large top row, 4 small bottom row */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={staggerContainer}
      >
        {FEATURES.map((feature) => (
          <motion.div
            key={feature.title}
            variants={fadeInUp}
            className={cn(
              'group rounded-3xl border border-kresna-border bg-white transition-all duration-300 ease-kresna',
              'hover:shadow-kresna hover:-translate-y-1 hover:border-primary-200',
              feature.span === 'large' ? 'lg:col-span-2 p-8 lg:p-10' : 'lg:col-span-1 p-6 lg:p-8'
            )}
          >
            <div className={cn(
              'flex items-center justify-center rounded-2xl bg-primary-50 border border-primary-100 mb-5 transition-all duration-300 group-hover:shadow-md group-hover:scale-105',
              feature.span === 'large' ? 'h-14 w-14' : 'h-12 w-12'
            )}>
              <feature.icon className={cn('text-primary-500', feature.span === 'large' ? 'h-7 w-7' : 'h-5 w-5')} />
            </div>
            <h3 className={cn(
              'font-bold text-charcoal mb-3',
              feature.span === 'large' ? 'text-xl lg:text-2xl' : 'text-lg'
            )}>
              {feature.title}
            </h3>
            <p className="text-sm text-kresna-gray-dark leading-relaxed mb-5">
              {feature.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {feature.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-xl bg-kresna-light text-kresna-gray-dark border border-kresna-border font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// ============================================================================
// PRICING — 3-column, center elevated, annual/monthly toggle
// ============================================================================

function PricingSection(): JSX.Element {
  const { t } = useTranslation();
  const plans = usePricingPlans();
  const [annual, setAnnual] = useState(false);

  return (
    <Section id="precios" className="bg-kresna-light">
      <SectionHeader
        badge={t('landing.pricing.badge')}
        title={t('landing.pricing.title')}
        subtitle={t('landing.pricing.subtitle')}
      />

      {/* Annual/Monthly toggle */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="flex items-center justify-center gap-4 mb-14"
      >
        <span className={cn('text-sm font-medium transition-colors', !annual ? 'text-charcoal' : 'text-kresna-gray')}>
          {t('landing.pricing.monthly', { defaultValue: 'Mensual' })}
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className={cn(
            'relative h-7 w-12 rounded-full transition-colors duration-300',
            annual ? 'bg-primary-500' : 'bg-kresna-border'
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-300',
              annual ? 'translate-x-[22px]' : 'translate-x-0.5'
            )}
          />
        </button>
        <span className={cn('text-sm font-medium transition-colors', annual ? 'text-charcoal' : 'text-kresna-gray')}>
          {t('landing.pricing.annual', { defaultValue: 'Anual' })}
        </span>
        {annual && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 font-semibold">
            -20%
          </span>
        )}
      </motion.div>

      {/* Trial badge */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="text-center mb-12"
      >
        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent-50 border border-accent-200 text-accent-700 text-sm font-semibold">
          <Zap className="h-4 w-4" />
          14 {t('landing.pricing.trialDays', { defaultValue: 'dias de prueba gratis en todos los planes' })}
        </span>
      </motion.div>

      {/* Pricing Cards */}
      <motion.div
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-start"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer}
      >
        {plans.map((plan) => {
          const monthlyPrice = parseInt(plan.price, 10);
          const displayPrice = annual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;

          return (
            <motion.div
              key={plan.code}
              variants={scaleIn}
              className={cn(
                'relative rounded-3xl p-7 lg:p-9 transition-all duration-300 ease-kresna',
                plan.highlighted
                  ? 'bg-white border-2 border-primary-500 shadow-kresna-lg lg:scale-105 lg:-my-4'
                  : 'border border-kresna-border bg-white shadow-card hover:shadow-kresna'
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-5 py-1.5 rounded-full bg-gradient-primary text-white text-xs font-bold shadow-kresna-btn">
                    {t('billing.recommended')}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-charcoal mb-2">{plan.name}</h3>
                <p className="text-sm text-kresna-gray-dark leading-relaxed">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold text-charcoal tracking-tight">&euro;{displayPrice}</span>
                  <span className="text-kresna-gray text-sm">{plan.period}</span>
                </div>
                {annual && (
                  <p className="text-xs text-kresna-gray line-through mt-1">&euro;{monthlyPrice}{plan.period}</p>
                )}
                <p className="text-sm text-primary-500 font-semibold mt-3">{plan.employees}</p>
              </div>

              <ul className="space-y-3.5 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5',
                      plan.highlighted ? 'bg-primary-50' : 'bg-kresna-light'
                    )}>
                      <Check className={cn(
                        'h-3 w-3',
                        plan.highlighted ? 'text-primary-500' : 'text-kresna-gray-medium'
                      )} />
                    </div>
                    <span className="text-sm text-kresna-gray-dark">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                <Button asChild size="touch" variant="gradient" className="w-full shadow-kresna-btn">
                  <Link to="/auth/signup">{plan.cta}</Link>
                </Button>
              ) : (
                <Button asChild size="touch" variant="outline" className="w-full">
                  <Link to="/auth/signup">{plan.cta}</Link>
                </Button>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      <motion.p
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="mt-12 text-center text-sm text-kresna-gray flex items-center justify-center gap-2"
      >
        <Shield className="h-4 w-4 text-primary-500" />
        {t('landing.pricing.trialNote')}
      </motion.p>
    </Section>
  );
}

// ============================================================================
// FAQ — Smooth accordion with AnimatePresence
// ============================================================================

function FAQSection(): JSX.Element {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData = t('landing.faqItems', { returnObjects: true }) as Array<{ q: string; a: string }>;
  const items = Array.isArray(faqData) ? faqData : [];

  return (
    <Section id="faq" className="bg-white">
      <div className="max-w-3xl mx-auto">
        <SectionHeader
          badge={t('landing.nav.faq')}
          title={t('landing.faq.title')}
        />

        <motion.div
          className="space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={item.q}
                variants={fadeInUp}
                className={cn(
                  'rounded-3xl border bg-white overflow-hidden transition-all duration-300',
                  isOpen
                    ? 'border-primary-200 shadow-kresna'
                    : 'border-kresna-border shadow-card hover:shadow-kresna hover:border-kresna-gray-medium'
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 sm:p-7 text-left group min-h-touch"
                >
                  <span className={cn(
                    'font-semibold pr-4 transition-colors duration-200 text-base',
                    isOpen ? 'text-primary-600' : 'text-charcoal group-hover:text-primary-500'
                  )}>
                    {item.q}
                  </span>
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                    isOpen ? 'bg-primary-50 rotate-180' : 'bg-kresna-light'
                  )}>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-colors',
                      isOpen ? 'text-primary-500' : 'text-kresna-gray'
                    )} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.44, 0, 0.56, 1] }}
                    >
                      <div className="px-6 sm:px-7 pb-6 sm:pb-7 text-sm text-kresna-gray-dark leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <p className="text-kresna-gray mb-5 text-sm">{t('landing.faq.moreQuestions')}</p>
          <Button variant="outline" size="touch" asChild className="shadow-card">
            <a href="mailto:soporte@lsltgroup.es">{t('landing.faq.contactSupport')}</a>
          </Button>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================================================
// FINAL CTA — Bold gradient section
// ============================================================================

function CTASection(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-[80px]" />

      <motion.div
        className="relative z-10 mx-auto max-w-kresna px-5 sm:px-8 lg:px-10 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium border border-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            {t('landing.hero.badge', { defaultValue: 'Cumplimiento garantizado con la ley laboral espanola' })}
          </span>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          className="text-3xl sm:text-4xl lg:text-display font-bold text-white tracking-display leading-tight mb-6"
        >
          {t('landing.cta.readyTitle')}
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="text-lg sm:text-xl text-white/70 mb-12 max-w-xl mx-auto leading-relaxed"
        >
          {t('landing.cta.readySubtitle')}
        </motion.p>
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="touch-lg"
            className="w-full sm:w-auto bg-white text-primary-600 hover:bg-white/90 font-bold text-base shadow-kresna-lg"
          >
            <Link to="/auth/signup">
              {t('landing.cta.startNow')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="touch"
            asChild
            className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
          >
            <a href="#precios">
              {t('landing.nav.pricing')}
            </a>
          </Button>
        </motion.div>
        <motion.p variants={fadeInUp} className="mt-8 text-sm text-white/50">
          {t('landing.hero.trustSignals')}
        </motion.p>
      </motion.div>
    </section>
  );
}

// ============================================================================
// FOOTER — Dark background with grid columns
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
    <footer className="bg-charcoal text-white">
      <div className="mx-auto max-w-kresna px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column — spans 2 */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-kresna-btn transition-transform duration-300 group-hover:scale-105">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white leading-none tracking-tight">
                  Torre Tempo
                </span>
                <span className="text-[10px] text-white/40 leading-none mt-0.5">
                  {t('landing.brandSubtitle')}
                </span>
              </div>
            </Link>
            <p className="text-sm text-white/50 mb-6 leading-relaxed max-w-xs">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Globe className="h-3.5 w-3.5" />
              <span>{t('landing.footer.madeIn')}</span>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-white/80 text-sm mb-5 uppercase tracking-wider">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') || link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm text-white/40 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-white/40 hover:text-white transition-colors duration-200"
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
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} {t('landing.footer.copyright')}
          </p>
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <Link to="/auth/signin" className="text-xs text-white/40 hover:text-white transition-colors">
              {t('auth.signIn')}
            </Link>
            <Link to="/auth/signup" className="text-xs text-white/40 hover:text-white transition-colors">
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
    <div className="min-h-screen bg-white text-charcoal antialiased">
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
