import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Clock, Shield, Sparkles, Check } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export default function SignUp() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        toast.error(result.error.message || t('errors.signUpFailed'));
        return;
      }

      toast.success(t('auth.accountCreated'));
      navigate('/dashboard');
    } catch {
      toast.error(t('errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordLength = password.length;
  const hasMinLength = passwordLength >= 8;

  return (
    <div className="flex min-h-screen">
      {/* Left panel - device mockup with gradient background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative blurred circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-700/30 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Torre Tempo</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{t('auth.signupHeroTitle')}</h2>
          <p className="text-primary-100 text-lg">{t('auth.signupHeroSubtitle')}</p>
        </div>

        {/* Device mockup - phone frame with schedule content */}
        <div className="relative z-10 flex justify-center py-8">
          <div className="w-[280px] rounded-[2rem] border-[6px] border-white/20 bg-white shadow-kresna-lg overflow-hidden">
            {/* Phone status bar */}
            <div className="flex items-center justify-between bg-primary-500 px-5 py-2">
              <span className="text-[10px] font-medium text-white/80">9:41</span>
              <div className="flex gap-1">
                <div className="h-1.5 w-3 rounded-full bg-white/60" />
                <div className="h-1.5 w-3 rounded-full bg-white/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
              </div>
            </div>

            {/* App header */}
            <div className="bg-primary-500 px-5 pb-4 pt-1">
              <p className="text-xs font-semibold text-white">{t('nav.roster')}</p>
              <p className="text-[10px] text-primary-100 mt-0.5">Lun 17 - Dom 23 Feb</p>
            </div>

            {/* Schedule rows */}
            <div className="px-4 py-3 space-y-2.5">
              {/* Row 1 */}
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary-600">AM</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-20 rounded-full bg-charcoal/80" />
                  <div className="flex gap-1">
                    <div className="h-5 flex-1 rounded-lg bg-primary-100 border border-primary-200" />
                    <div className="h-5 flex-1 rounded-lg bg-primary-400" />
                    <div className="h-5 flex-1 rounded-lg bg-primary-100 border border-primary-200" />
                    <div className="h-5 flex-1 rounded-lg bg-accent-100 border border-accent-200" />
                    <div className="h-5 flex-1 rounded-lg bg-primary-400" />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-accent-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-accent-600">PM</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-16 rounded-full bg-charcoal/80" />
                  <div className="flex gap-1">
                    <div className="h-5 flex-1 rounded-lg bg-accent-200 border border-accent-300" />
                    <div className="h-5 flex-1 rounded-lg bg-accent-400" />
                    <div className="h-5 flex-1 rounded-lg bg-kresna-light border border-kresna-border" />
                    <div className="h-5 flex-1 rounded-lg bg-accent-200 border border-accent-300" />
                    <div className="h-5 flex-1 rounded-lg bg-accent-400" />
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-orange-600">NT</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-24 rounded-full bg-charcoal/80" />
                  <div className="flex gap-1">
                    <div className="h-5 flex-1 rounded-lg bg-orange-100 border border-orange-200" />
                    <div className="h-5 flex-1 rounded-lg bg-kresna-light border border-kresna-border" />
                    <div className="h-5 flex-1 rounded-lg bg-orange-300" />
                    <div className="h-5 flex-1 rounded-lg bg-orange-100 border border-orange-200" />
                    <div className="h-5 flex-1 rounded-lg bg-orange-300" />
                  </div>
                </div>
              </div>

              {/* Compliance badge */}
              <div className="flex items-center gap-2 mt-3 bg-accent-50 rounded-xl px-3 py-2 border border-accent-200">
                <Shield className="h-3.5 w-3.5 text-accent-500" />
                <span className="text-[10px] font-medium text-accent-700">{t('auth.featureLegalCompliance')}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-200">{t('auth.usedByCompanies')}</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md">
          {/* Mobile logo with gradient branding */}
          <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-kresna-btn">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-charcoal">Torre Tempo</h1>
              <p className="text-sm text-kresna-gray mt-1">{t('auth.subtitle')}</p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-kresna-border bg-white p-8 shadow-kresna space-y-8">
            <div className="text-center space-y-4">
              {/* Trial badge - prominent pill */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 text-primary-600 text-sm font-semibold shadow-sm">
                <Sparkles className="h-4 w-4" />
                {t('trial.badge')}
              </div>

              <div>
                <h2 className="text-heading-4 text-charcoal">{t('auth.createAccount')}</h2>
                <p className="text-body-sm text-kresna-gray-dark mt-2">{t('auth.getStarted')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">{t('auth.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-kresna-gray" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-13"
                    required
                    autoComplete="name"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('common.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-kresna-gray" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-13"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-kresna-gray" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-13"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {/* Password requirements */}
                <div className="flex items-center gap-2 pt-1">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-200 ${
                    hasMinLength
                      ? 'bg-accent-500 text-white'
                      : 'bg-kresna-light text-kresna-gray-medium'
                  }`}>
                    <Check className="h-3 w-3" />
                  </div>
                  <span className={`text-xs transition-colors duration-200 ${
                    hasMinLength ? 'text-accent-600 font-medium' : 'text-kresna-gray'
                  }`}>
                    {t('auth.minChars')}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="touch"
                className="w-full"
                loading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t('auth.createAccount')}
              </Button>
            </form>

            <p className="text-center text-xs text-kresna-gray">
              {t('auth.signupHeroSubtitle')}
            </p>
          </div>

          <p className="mt-8 text-center text-sm text-kresna-gray-dark">
            {t('auth.hasAccount')}{' '}
            <Link to="/auth/signin" className="font-medium text-primary-500 hover:text-primary-600 transition-colors">
              {t('auth.signIn')}
            </Link>
          </p>

          {/* Language switcher at the bottom */}
          <div className="mt-8 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
