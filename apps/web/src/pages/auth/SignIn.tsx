import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export default function SignIn() {
  const location = useLocation();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Read directly from DOM to handle browser autofill (which may not trigger onChange)
    const form = e.currentTarget;
    const formEmail = (form.elements.namedItem('email') as HTMLInputElement)?.value || email;
    const formPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value || password;

    if (!formEmail.trim() || !formPassword.trim()) {
      toast.error(t('errors.signInFailed'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: formEmail,
        password: formPassword,
      });

      if (result.error) {
        toast.error(result.error.message || t('errors.signInFailed'));
        return;
      }

      toast.success(t('auth.welcomeBack'));
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = from;
    } catch {
      toast.error(t('errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — gradient bg with device mockup */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-primary-600 to-primary-500 p-12 flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-[80px]" />

        {/* Phone frame */}
        <div className="relative z-10 mx-auto w-[300px]">
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

            {/* App content mockup — dashboard view */}
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

              {/* Clock-in button */}
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
          <div className="absolute -right-14 top-20 rounded-2xl bg-white border border-kresna-border shadow-kresna px-4 py-3 animate-float">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-charcoal">12 fichados</span>
            </div>
          </div>

          <div className="absolute -left-10 bottom-32 rounded-2xl bg-white border border-kresna-border shadow-kresna px-4 py-3 animate-float [animation-delay:1s]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-charcoal">ITSS OK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-kresna-light px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo — visible on mobile only */}
          <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-kresna-btn">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-charcoal">Torre Tempo</h1>
              <p className="text-sm text-kresna-gray mt-1">{t('auth.subtitle')}</p>
            </div>
          </div>

          {/* Form card — frosted glass on mobile, solid on desktop */}
          <div className="rounded-[32px] border border-kresna-border bg-white/90 backdrop-blur-sm lg:bg-white p-8 shadow-kresna space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-charcoal">{t('auth.welcomeBack')}</h2>
              <p className="text-sm text-kresna-gray-dark mt-1.5">{t('auth.signInContinue')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('common.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kresna-gray" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 min-h-touch text-base"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t('auth.password')}
                  </Label>
                  <Link
                    to="/auth/reset-password"
                    className="text-xs text-primary-500 hover:text-primary-600 hover:underline transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kresna-gray" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 min-h-touch text-base"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="touch"
                className="w-full"
                loading={isLoading}
                rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
              >
                {t('auth.signIn')}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-kresna-gray-dark">
            {t('auth.noAccount')}{' '}
            <Link
              to="/auth/signup"
              className="font-medium text-primary-500 hover:text-primary-600 hover:underline transition-colors"
            >
              {t('auth.signUp')}
            </Link>
          </p>

          {/* Language switcher — bottom-right */}
          <div className="mt-6 flex justify-end">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
