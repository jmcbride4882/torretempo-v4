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
          <div className="text-center">
            {isVerifying ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 border border-primary-100">
                  <Mail className="h-6 w-6 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-charcoal">{t('auth.verifyingEmail')}</h2>
                <p className="text-sm text-kresna-gray-dark mt-1">{t('common.loading')}...</p>
                <div className="mt-6 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-kresna-border border-t-primary-500" />
                </div>
              </>
            ) : success ? (
              <div className="py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 border border-accent-200">
                  <CheckCircle2 className="h-7 w-7 text-accent-600" />
                </div>
                <h2 className="text-lg font-semibold text-charcoal">{t('auth.emailVerified')}</h2>
                <p className="mt-2 text-sm text-kresna-gray-dark">
                  {t('auth.emailVerifiedRedirect')}
                </p>
              </div>
            ) : (
              <div className="py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200">
                  <AlertCircle className="h-7 w-7 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-charcoal">{t('auth.verificationFailed')}</h2>
                <p className="mt-2 text-sm text-kresna-gray-dark">{error}</p>
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
              className="inline-flex items-center gap-2 text-sm text-kresna-gray-dark transition-colors hover:text-charcoal"
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
