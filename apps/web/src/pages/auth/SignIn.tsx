import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Clock, Shield, FileText } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
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
      {/* Left brand panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-surface-dark via-slate-900 to-primary-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 shadow-glow">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Torre Tempo</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Control horario digital<br/>para tu equipo</h2>
          <p className="text-slate-400 text-lg">Cumplimiento automatico con el Estatuto de los Trabajadores.</p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Shield className="h-4 w-4 text-primary-400" />
            </div>
            <span className="text-sm">Cumplimiento legal automatico</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Clock className="h-4 w-4 text-accent-400" />
            </div>
            <span className="text-sm">Fichaje en 2 segundos</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm">Exportacion de nominas integrada</span>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">Usado por +500 empresas espanolas</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          {/* Logo - visible on mobile only */}
          <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-glow">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">Torre Tempo</h1>
              <p className="text-sm text-slate-500 mt-1">{t('auth.subtitle')}</p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">{t('auth.welcomeBack')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('auth.signInContinue')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">{t('common.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700">{t('auth.password')}</Label>
                  <Link
                    to="/auth/reset-password"
                    className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 min-h-touch"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <>
                    {t('auth.signIn')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t('auth.noAccount')}{' '}
            <Link to="/auth/signup" className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
              {t('auth.signUp')}
            </Link>
          </p>

          <div className="mt-6 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
