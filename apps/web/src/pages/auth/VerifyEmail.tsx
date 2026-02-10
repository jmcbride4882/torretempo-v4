import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('auth.invalidToken'));
      setIsVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('auth.verificationFailed'));
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.verificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/20">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-zinc-900">Torre Tempo</h1>
            <p className="text-sm text-zinc-500 mt-1">{t('auth.subtitle')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
          <div className="text-center">
            {isVerifying ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 border border-primary-200">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">{t('auth.verifyingEmail')}</h2>
                <p className="text-sm text-zinc-500 mt-1">{t('common.loading')}...</p>
                <div className="mt-6 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
                </div>
              </>
            ) : success ? (
              <div className="py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">{t('auth.emailVerified')}</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {t('auth.emailVerifiedRedirect')}
                </p>
              </div>
            ) : (
              <div className="py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200">
                  <AlertCircle className="h-7 w-7 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">{t('auth.verificationFailed')}</h2>
                <p className="mt-2 text-sm text-zinc-500">{error}</p>
                <Button
                  onClick={() => navigate('/auth/signin')}
                  className="mt-6"
                >
                  {t('auth.goToSignIn')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {!isVerifying && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/auth/signin')}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('auth.backToSignIn')}
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
