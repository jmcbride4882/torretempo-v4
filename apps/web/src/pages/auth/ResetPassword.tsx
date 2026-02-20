import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-charcoal">Torre Tempo</h1>
            <p className="text-sm text-kresna-gray mt-1">{t('auth.subtitle')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-kresna-border bg-white p-6 shadow-card space-y-6">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 border border-accent-200">
                <CheckCircle2 className="h-7 w-7 text-accent-600" />
              </div>
              <h2 className="text-lg font-semibold text-charcoal">{t('auth.passwordReset')}</h2>
              <p className="mt-2 text-sm text-kresna-gray-dark">
                {t('auth.passwordUpdated')}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 border border-primary-100">
                  <KeyRound className="h-6 w-6 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-charcoal">{t('auth.resetPassword')}</h2>
                <p className="text-sm text-kresna-gray-dark mt-1">{t('auth.enterNewPassword')}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.newPassword')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.enterNewPassword')}
                    disabled={isLoading || !token}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-kresna-gray">{t('auth.minChars')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth.confirmNewPassword')}
                    disabled={isLoading || !token}
                    required
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !token || !password || !confirmPassword}
                  className="w-full h-12 min-h-touch"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    t('auth.resetPassword')
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/auth/signin')}
            className="inline-flex items-center gap-2 text-sm text-kresna-gray-dark transition-colors hover:text-charcoal"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backToSignIn')}
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
