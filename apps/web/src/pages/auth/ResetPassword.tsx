import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

/* ══════════════════════════════════════════════════════════════════════════════
   Reset Password — Kresna Redesign
   - Centered single-column layout
   - Frosted glass card with gradient icon
   - Larger touch targets, better spacing
   - Success state with animated check
   ══════════════════════════════════════════════════════════════════════════════ */

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('auth.invalidToken'));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('auth.invalidToken'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.minChars'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('auth.resetFailed'));
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-secondary px-5">
      {/* Decorative gradient orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary-50 blur-[200px] opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-primary shadow-kresna-btn">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-charcoal tracking-tight">Torre Tempo</h1>
            <p className="text-sm text-kresna-gray mt-1">{t('auth.subtitle')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-kresna-border bg-white p-8 sm:p-10 shadow-kresna space-y-6">
          {success ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-200 animate-scale-in">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-charcoal">{t('auth.passwordReset')}</h2>
              <p className="mt-3 text-sm text-kresna-gray-dark leading-relaxed">
                {t('auth.passwordUpdated')}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-50 border border-primary-100">
                  <KeyRound className="h-7 w-7 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-charcoal">{t('auth.resetPassword')}</h2>
                <p className="text-sm text-kresna-gray-dark mt-2 leading-relaxed">{t('auth.enterNewPassword')}</p>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">{t('auth.newPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kresna-gray" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.enterNewPassword')}
                      disabled={isLoading || !token}
                      required
                      minLength={8}
                      className="pl-10 h-12 min-h-touch"
                    />
                  </div>
                  <p className="text-xs text-kresna-gray pl-1">{t('auth.minChars')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kresna-gray" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirmNewPassword')}
                      disabled={isLoading || !token}
                      required
                      minLength={8}
                      className="pl-10 h-12 min-h-touch"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !token || !password || !confirmPassword}
                  variant="gradient"
                  size="touch"
                  loading={isLoading}
                  className="w-full shadow-kresna-btn"
                >
                  {t('auth.resetPassword')}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Back to sign in */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/auth/signin')}
            className="inline-flex items-center gap-2 text-sm font-medium text-kresna-gray-dark transition-colors hover:text-charcoal min-h-touch"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backToSignIn')}
          </button>
        </div>

        {/* Language switcher */}
        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
