import * as React from 'react';
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
  ArrowLeftRight,
  Key,
  Check,
  ChevronDown,
  Twitter,
  Linkedin,
  Github,
  MapPin,
  Smartphone,
  Fingerprint,
  QrCode,
  Keyboard,
  Menu,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  highlights: string[];
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
}

interface FAQ {
  question: string;
  answer: string;
}

// ============================================================================
// DATA
// ============================================================================

const FEATURES: Feature[] = [
  {
    icon: Clock,
    title: 'Reloj de Fichar',
    description: 'Cuatro métodos de fichaje con verificación geográfica integrada',
    highlights: ['Tap en móvil', 'NFC Badge', 'Código QR', 'PIN numérico', 'Geofencing GPS'],
  },
  {
    icon: ShieldCheck,
    title: 'Cumplimiento ITSS',
    description: 'Automatización total de la normativa laboral española',
    highlights: ['12h descanso mínimo', '9h jornada máxima', '40h semanales', 'Alertas automáticas'],
  },
  {
    icon: FileText,
    title: 'Informes Automáticos',
    description: 'Documentación lista para inspección en cualquier momento',
    highlights: ['PDFs mensuales', 'Análisis de varianza', 'Exportación nóminas', 'Cumplimiento legal'],
  },
  {
    icon: Calendar,
    title: 'Gestión de Turnos',
    description: 'Planificación visual con marketplace de turnos abiertos',
    highlights: ['Drag & drop', 'Turnos abiertos', 'Auto-asignación', 'Vista semanal/mensual'],
  },
  {
    icon: ArrowLeftRight,
    title: 'Intercambios P2P',
    description: 'Sistema de cambios entre empleados con aprobación dual',
    highlights: ['Solicitud peer-to-peer', 'Aprobación compañero', 'Validación manager', 'Historial completo'],
  },
  {
    icon: Key,
    title: 'API Inspector',
    description: 'Acceso de solo lectura para inspectores de trabajo ITSS',
    highlights: ['Token temporal', 'Solo lectura', 'Auditoría SHA-256', 'Cadena inmutable'],
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '10',
    period: '/usuario/mes',
    description: 'Perfecto para pequeños equipos que empiezan',
    features: [
      'Hasta 5 usuarios',
      'Reloj de fichar (tap + PIN)',
      'Informes básicos',
      'Soporte por email',
      'App móvil PWA',
    ],
    cta: 'Empezar Gratis',
  },
  {
    name: 'Professional',
    price: '8',
    period: '/usuario/mes',
    description: 'Todo lo que necesitas para cumplir con la ITSS',
    features: [
      'Usuarios ilimitados',
      'Todos los métodos de fichaje',
      'Cumplimiento ITSS completo',
      'API Inspector incluida',
      'Informes avanzados',
      'Gestión de turnos',
      'Intercambios P2P',
      'Soporte prioritario',
    ],
    highlighted: true,
    cta: 'Probar 14 días gratis',
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Para organizaciones con necesidades específicas',
    features: [
      'Todo en Professional',
      'White-label personalizado',
      'Integración SSO/SAML',
      'API completa',
      'SLA garantizado 99.9%',
      'Soporte dedicado 24/7',
      'Implementación guiada',
      'Formación presencial',
    ],
    cta: 'Contactar Ventas',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'Desde que implementamos Torre Tempo, las inspecciones de trabajo son un trámite. Tenemos todo documentado y accesible en segundos. El inspector quedó impresionado.',
    author: 'María García',
    role: 'Directora de RRHH',
    company: 'Hostelería Mediterránea SL',
    avatar: 'MG',
  },
  {
    quote: 'Antes perdíamos horas cada mes preparando informes. Ahora se generan automáticamente y puedo centrarme en lo que importa: mi equipo.',
    author: 'Carlos Ruiz',
    role: 'Gerente de Operaciones',
    company: 'Retail Express España',
    avatar: 'CR',
  },
  {
    quote: 'La función offline es increíble. Nuestros empleados fichan aunque no haya cobertura y se sincroniza automáticamente. Cero errores, cero excusas.',
    author: 'Ana Martínez',
    role: 'CEO',
    company: 'Servicios Técnicos del Norte',
    avatar: 'AM',
  },
];

const FAQS: FAQ[] = [
  {
    question: '¿Qué es el cumplimiento ITSS?',
    answer: 'La ITSS (Inspección de Trabajo y Seguridad Social) exige que las empresas españolas registren la jornada laboral de sus empleados. Torre Tempo automatiza este cumplimiento verificando descansos mínimos de 12 horas, jornadas máximas de 9 horas y límites semanales de 40 horas, generando alertas cuando hay riesgo de incumplimiento.',
  },
  {
    question: '¿Cómo funciona el reloj de fichar?',
    answer: 'Ofrecemos cuatro métodos de fichaje: tap en móvil (un solo toque), badge NFC (aproximar tarjeta), código QR (escanear con cámara) y PIN numérico (código personal). Todos incluyen verificación geográfica opcional para confirmar que el empleado está en el lugar de trabajo.',
  },
  {
    question: '¿Puedo usar Torre Tempo sin conexión?',
    answer: 'Sí, Torre Tempo es una PWA (Progressive Web App) diseñada para funcionar offline. Los fichajes se almacenan localmente y se sincronizan automáticamente cuando vuelve la conexión. Ideal para lugares con cobertura irregular.',
  },
  {
    question: '¿Los datos están seguros?',
    answer: 'Absolutamente. Utilizamos cifrado SHA-256 con cadena de hash inmutable para el registro de auditoría. Los datos se almacenan con Row-Level Security (RLS) en PostgreSQL, cumpliendo con GDPR. Cada registro es verificable e inalterable.',
  },
  {
    question: '¿Cuánto tiempo tarda la implementación?',
    answer: 'La mayoría de empresas están operativas en menos de 24 horas. El proceso incluye: crear cuenta, invitar empleados, configurar ubicaciones y empezar a fichar. Ofrecemos formación gratuita por videollamada para planes Professional y Enterprise.',
  },
  {
    question: '¿Ofrecen soporte en español?',
    answer: 'Por supuesto. Somos una empresa española y todo nuestro equipo de soporte habla español nativo. Atendemos por email, chat y teléfono (planes Professional y Enterprise). Nuestro tiempo medio de respuesta es inferior a 2 horas.',
  },
];

const FOOTER_LINKS = {
  Producto: ['Funciones', 'Precios', 'Integraciones', 'Actualizaciones'],
  Empresa: ['Sobre Nosotros', 'Blog', 'Empleo', 'Prensa'],
  Recursos: ['Documentación', 'API', 'Guías', 'Soporte'],
  Legal: ['Privacidad', 'Términos', 'Cookies', 'GDPR'],
};

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
// COMPONENTS
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
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Torre Tempo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#funciones" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Funciones
            </a>
            <a href="#precios" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Precios
            </a>
            <a href="#testimonios" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Testimonios
            </a>
            <a href="#faq" className="text-sm text-neutral-400 hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth/signin">Iniciar Sesión</Link>
            </Button>
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link to="/auth/signup">Empezar Gratis</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-neutral-900/95 backdrop-blur-lg"
          >
            <div className="px-4 py-4 space-y-3">
              <a
                href="#funciones"
                onClick={() => setIsOpen(false)}
                className="block py-2 text-neutral-300 hover:text-white"
              >
                Funciones
              </a>
              <a
                href="#precios"
                onClick={() => setIsOpen(false)}
                className="block py-2 text-neutral-300 hover:text-white"
              >
                Precios
              </a>
              <a
                href="#testimonios"
                onClick={() => setIsOpen(false)}
                className="block py-2 text-neutral-300 hover:text-white"
              >
                Testimonios
              </a>
              <a
                href="#faq"
                onClick={() => setIsOpen(false)}
                className="block py-2 text-neutral-300 hover:text-white"
              >
                FAQ
              </a>
              <div className="pt-4 flex flex-col gap-2">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth/signin">Iniciar Sesión</Link>
                </Button>
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600">
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

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-neutral-950">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px]" />
        
        {/* Grid overlay */}
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
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
          >
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">ITSS-Ready | GDPR Compliant</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight tracking-tight"
          >
            El Sistema de Gestión
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              que los Inspectores Aman
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed"
          >
            Control de presencia móvil-first para empresas españolas.
            <br className="hidden sm:block" />
            Cumplimiento automático • PWA offline • Auditoría inmutable SHA-256
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: Smartphone, label: 'Tap móvil' },
              { icon: Fingerprint, label: 'NFC Badge' },
              { icon: QrCode, label: 'Código QR' },
              { icon: Keyboard, label: 'PIN' },
              { icon: MapPin, label: 'Geofencing' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
              >
                <item.icon className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-neutral-300">{item.label}</span>
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
              <a href="#funciones">
                Ver Funciones
                <ChevronDown className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 flex flex-col items-center"
          >
            <p className="text-sm text-neutral-500 mb-4">Sin tarjeta de crédito • Configuración en 5 minutos</p>
            <div className="flex items-center gap-8 text-neutral-500">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">SHA-256 Audit</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">PWA Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">RLS Security</span>
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

function FeaturesSection() {
  return (
    <section id="funciones" className="relative py-24 bg-neutral-950">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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
            Funcionalidades
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Todo lo que necesitas para cumplir
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Desde el fichaje hasta los informes, automatizamos el cumplimiento laboral español
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="group relative"
            >
              <div className="glass-card p-6 h-full hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5">
                {/* Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-emerald-400" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-neutral-400 mb-4">{feature.description}</p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2">
                  {feature.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="text-xs px-2 py-1 rounded-md bg-white/5 text-neutral-300 border border-white/5"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="precios" className="relative py-24 bg-neutral-950">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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

        {/* Pricing Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
        >
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.name}
              variants={scaleIn}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                'relative rounded-2xl p-6 lg:p-8 transition-all duration-300 hover:scale-105',
                tier.highlighted
                  ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/10'
                  : 'glass-card'
              )}
            >
              {/* Popular Badge */}
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-500/30">
                    Más Popular
                  </span>
                </div>
              )}

              {/* Tier Info */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  {tier.price !== 'Personalizado' ? (
                    <>
                      <span className="text-4xl font-bold text-white">€{tier.price}</span>
                      <span className="text-neutral-400">{tier.period}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 mt-2">{tier.description}</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-neutral-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                asChild
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

        {/* Money Back Guarantee */}
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

function TestimonialsSection() {
  return (
    <section id="testimonios" className="relative py-24 bg-neutral-950 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-950 to-neutral-900/50" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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
            Empresas que confían en nosotros
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Descubre por qué cientos de empresas españolas eligen Torre Tempo
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6"
        >
          {TESTIMONIALS.map((testimonial) => (
            <motion.div
              key={testimonial.author}
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="glass-card p-6"
            >
              {/* Quote */}
              <div className="mb-6">
                <svg className="h-8 w-8 text-emerald-500/30" fill="currentColor" viewBox="0 0 32 32">
                  <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                </svg>
                <p className="mt-4 text-neutral-300 leading-relaxed">{testimonial.quote}</p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-neutral-400">
                    {testimonial.role} • {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-24 bg-neutral-950">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-lg text-neutral-400">
            ¿Tienes dudas? Aquí tienes las respuestas más comunes
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="space-y-4"
        >
          {FAQS.map((faq, index) => (
            <motion.div
              key={faq.question}
              variants={fadeInUp}
              transition={{ duration: 0.3 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-medium text-white pr-4">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-neutral-400 shrink-0 transition-transform duration-300',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-neutral-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-neutral-400 mb-4">¿No encuentras lo que buscas?</p>
          <Button variant="outline" asChild>
            <a href="mailto:soporte@torretempo.es">Contactar Soporte</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-24 bg-neutral-950 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-emerald-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            ¿Listo para cumplir sin esfuerzo?
          </h2>
          <p className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto">
            Únete a cientos de empresas españolas que ya confían en Torre Tempo para su gestión de personal.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
          </div>
          <p className="mt-6 text-sm text-neutral-500">
            14 días gratis • Sin tarjeta de crédito • Configuración en 5 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative bg-neutral-950 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Torre Tempo</span>
            </Link>
            <p className="text-sm text-neutral-400 mb-6">
              El sistema de gestión de personal que los inspectores aman.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            © 2026 LSLT Group. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="#" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Términos
            </a>
            <a href="#" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Cookies
            </a>
          </div>
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
