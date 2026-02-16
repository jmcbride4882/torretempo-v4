import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-zinc-200'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 shadow-md shadow-primary-500/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-zinc-900 leading-none tracking-tight">
                Torre Tempo
              </span>
              <span className="text-[10px] text-zinc-500 leading-none">
                {t('landing.brandSubtitle')}
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200"
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
            className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 transition-colors"
            aria-label={t('landing.nav.menu')}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block py-2.5 px-3 rounded-lg text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-2 border-t border-zinc-200">
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
    <section className="relative min-h-screen flex items-center justify-center pt-16 bg-zinc-50">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200 mb-8">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <span className="text-sm text-primary-700 font-medium">
              {t('landing.hero.badge')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-zinc-900 leading-[1.1] tracking-tight">
            {t('landing.hero.title1')}{' '}
            <span className="text-primary-500">
              {t('landing.hero.title2')}
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-base rounded-xl shadow-lg shadow-primary-500/20"
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
              className="w-full sm:w-auto px-8 py-6 text-base rounded-xl"
            >
              <a href="#como-funciona">
                <Play className="mr-2 h-4 w-4" />
                {t('landing.cta.seeDemo')}
              </a>
            </Button>
          </div>

          {/* Speed Metric Cards */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {SPEED_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <metric.icon className="h-4 w-4 text-primary-500" />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-zinc-400 line-through">{metric.before}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-300" />
                  <span className="text-2xl font-bold text-primary-500">{metric.after}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <p className="mt-10 text-sm text-zinc-400">
            {t('landing.hero.trustSignals')}
          </p>
        </div>
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
    maria: { ring: 'ring-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-50 border-emerald-200' },
    carlos: { ring: 'ring-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-50 border-blue-200' },
    laura: { ring: 'ring-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-50 border-purple-200' },
    carmen: { ring: 'ring-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-50 border-amber-200' },
  };

  const colors = personaColors[activeFlow.id]!;

  return (
    <section id="como-funciona" className="relative py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4">
            <Zap className="h-3.5 w-3.5" />
            {t('landing.nav.howItWorks')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-4 tracking-tight">
            {t('landing.personas.title')}
          </h2>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            {t('landing.personas.subtitle')}
          </p>
        </div>

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
                  'flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? cn('ring-2 bg-white shadow-sm text-zinc-900', tabColors.ring, tabColors.bg)
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                )}
              >
                <flow.icon className={cn('h-4 w-4', isActive ? tabColors.text : 'text-zinc-400')} />
                <span>{flow.persona}</span>
                <span className="hidden sm:inline text-xs text-zinc-400">{flow.role}</span>
              </button>
            );
          })}
        </div>

        {/* Active Flow Content */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
          {/* Flow header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b border-zinc-100">
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border', colors.icon)}>
              <activeFlow.icon className={cn('h-7 w-7', colors.text)} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-zinc-900">{activeFlow.persona}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                  {activeFlow.role}
                </span>
              </div>
              <p className="text-zinc-500 mt-1">{activeFlow.tagline}</p>
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
                    'group-hover:bg-zinc-50'
                  )}>
                    <step.icon className={cn('h-4 w-4', colors.text)} />
                  </div>
                  {stepIndex < activeFlow.steps.length - 1 && (
                    <div className="w-px h-4 sm:h-5 bg-zinc-100 mt-1" />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold text-zinc-900">
                    <span className={cn('mr-2 text-xs font-mono', colors.text)}>
                      {String(stepIndex + 1).padStart(2, '0')}
                    </span>
                    {step.title}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
    <section id="funciones" className="relative py-24 sm:py-32 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4">
            <Zap className="h-3.5 w-3.5" />
            {t('landing.nav.features')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-4 tracking-tight">
            {t('landing.features.title')}
          </h2>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={cn(
                'rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow',
                feature.span === 'large' ? 'lg:col-span-2' : 'lg:col-span-1'
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 border border-primary-200 mb-4">
                <feature.icon className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 border border-zinc-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING
// ============================================================================

function PricingSection(): JSX.Element {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);

  const pricingData = t('landing.pricing.tiers', { returnObjects: true }) as Array<{
    name: string; price: string; annualPrice: string; unit: string; description: string; features: string[]; cta: string; ctaLink: string;
  }>;

  const tiers = Array.isArray(pricingData) ? pricingData : [
    { name: t('landing.pricing.fallback.basic.name'), price: '2,50', annualPrice: '2,00', unit: t('landing.pricing.fallback.basic.unit'), description: t('landing.pricing.fallback.basic.description'), features: [t('landing.pricing.fallback.basic.features.0'), t('landing.pricing.fallback.basic.features.1'), t('landing.pricing.fallback.basic.features.2'), t('landing.pricing.fallback.basic.features.3'), t('landing.pricing.fallback.basic.features.4')], cta: t('landing.pricing.fallback.basic.cta'), ctaLink: '/auth/signup' },
    { name: t('landing.pricing.fallback.professional.name'), price: '4,50', annualPrice: '3,60', unit: t('landing.pricing.fallback.professional.unit'), description: t('landing.pricing.fallback.professional.description'), features: [t('landing.pricing.fallback.professional.features.0'), t('landing.pricing.fallback.professional.features.1'), t('landing.pricing.fallback.professional.features.2'), t('landing.pricing.fallback.professional.features.3'), t('landing.pricing.fallback.professional.features.4'), t('landing.pricing.fallback.professional.features.5')], cta: t('landing.pricing.fallback.professional.cta'), ctaLink: '/auth/signup' },
    { name: t('landing.pricing.fallback.enterprise.name'), price: t('landing.pricing.fallback.enterprise.price'), annualPrice: t('landing.pricing.fallback.enterprise.price'), unit: '', description: t('landing.pricing.fallback.enterprise.description'), features: [t('landing.pricing.fallback.enterprise.features.0'), t('landing.pricing.fallback.enterprise.features.1'), t('landing.pricing.fallback.enterprise.features.2'), t('landing.pricing.fallback.enterprise.features.3'), t('landing.pricing.fallback.enterprise.features.4'), t('landing.pricing.fallback.enterprise.features.5')], cta: t('landing.pricing.fallback.enterprise.cta'), ctaLink: 'mailto:ventas@lsltgroup.es' },
  ];

  return (
    <section id="precios" className="relative py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4">
            {t('landing.pricing.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-4 tracking-tight">
            {t('landing.pricing.title')}
          </h2>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={cn('text-sm transition-colors', !isAnnual ? 'text-zinc-900 font-medium' : 'text-zinc-400')}>
            {t('landing.pricing.monthly')}
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              'relative w-12 h-7 rounded-full transition-colors duration-200',
              isAnnual ? 'bg-primary-500' : 'bg-zinc-200'
            )}
          >
            <div
              className={cn('absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform', isAnnual ? 'translate-x-[22px]' : 'translate-x-[3px]')}
            />
          </button>
          <span className={cn('text-sm transition-colors', isAnnual ? 'text-zinc-900 font-medium' : 'text-zinc-400')}>
            {t('landing.pricing.annual')}
          </span>
          {isAnnual && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {t('landing.pricing.discount')}
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, index) => {
            const displayPrice = isAnnual ? tier.annualPrice : tier.price;
            const isCustom = !tier.unit;
            const highlighted = index === 1;

            return (
              <div
                key={tier.name}
                className={cn(
                  'relative rounded-2xl p-6 lg:p-7 transition-all duration-300',
                  highlighted
                    ? 'bg-primary-50 border-2 border-primary-500 shadow-xl shadow-primary-500/10'
                    : 'border border-zinc-200 bg-white shadow-sm hover:shadow-md'
                )}
              >
                {highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-primary-500 text-white text-xs font-semibold shadow-md">
                      {t('billing.recommended')}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-3">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    {isCustom ? (
                      <span className="text-2xl font-bold text-zinc-900">{displayPrice}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-zinc-900">&euro;{displayPrice}</span>
                        <span className="text-zinc-500 text-sm">{tier.unit}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={cn('w-full', highlighted ? '' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900')}
                  variant={highlighted ? 'default' : 'secondary'}
                >
                  {tier.ctaLink.startsWith('mailto:') ? (
                    <a href={tier.ctaLink}>{tier.cta}</a>
                  ) : (
                    <Link to={tier.ctaLink}>{tier.cta}</Link>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-zinc-400 flex items-center justify-center gap-2">
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

  const faqData = t('landing.faq.items', { returnObjects: true }) as Array<{ question: string; answer: string }>;
  const items = Array.isArray(faqData) ? faqData : [];

  return (
    <section id="faq" className="relative py-24 sm:py-32 bg-zinc-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4">
            {t('landing.nav.faq')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-4 tracking-tight">
            {t('landing.faq.title')}
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.question} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left group"
              >
                <span className="font-medium text-zinc-900 pr-4 group-hover:text-primary-600 transition-colors">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-zinc-400 shrink-0 transition-transform duration-300',
                    openIndex === index && 'rotate-180 text-primary-500'
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-zinc-500 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-zinc-400 mb-4 text-sm">{t('landing.faq.moreQuestions')}</p>
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
    <section className="relative py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-6 tracking-tight">
          {t('landing.cta.readyTitle')}
        </h2>
        <p className="text-lg text-zinc-500 mb-10 max-w-xl mx-auto">
          {t('landing.cta.readySubtitle')}
        </p>
        <Button
          asChild
          size="lg"
          className="w-full sm:w-auto px-10 py-6 text-base rounded-xl shadow-lg shadow-primary-500/20"
        >
          <Link to="/auth/signup">
            {t('landing.cta.startNow')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <p className="mt-6 text-sm text-zinc-400">
          {t('landing.hero.trustSignals')}
        </p>
      </div>
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
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-zinc-900 leading-none tracking-tight">
                  Torre Tempo
                </span>
                <span className="text-[10px] text-zinc-500 leading-none">
                  {t('landing.brandSubtitle')}
                </span>
              </div>
            </Link>
            <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Globe className="h-3.5 w-3.5" />
              <span>{t('landing.footer.madeIn')}</span>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-zinc-900 text-sm mb-4">{column.title}</h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') || link.href.startsWith('#') ? (
                      <a href={link.href} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors duration-200">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors duration-200">
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
        <div className="mt-12 pt-8 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-400">
            &copy; {new Date().getFullYear()} {t('landing.footer.copyright')}
          </p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/auth/signin" className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
              {t('auth.signIn')}
            </Link>
            <Link to="/auth/signup" className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
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
