import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

/* ══════════════════════════════════════════════════════════════════════════════
   Verify Email — Kresna Redesign
   - Centered single-column layout with decorative gradient orb
   - Three states: verifying (spinner), success (animated check), error
   - Kresna shadows, larger icons, better visual hierarchy
   ══════════════════════════════════════════════════════════════════════════════ */

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
        <div className="rounded-3xl border border-kresna-border bg-white p-8 sm:p-10 shadow-kresna">
          <div className="text-center">
            {isVerifying ? (
              /* ── Verifying State ── */
              <div className="py-8">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 border border-primary-100">
                  <Mail className="h-8 w-8 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-charcoal mb-2">{t('auth.verifyingEmail')}</h2>
                <p className="text-sm text-kresna-gray-dark">{t('common.loading')}...</p>
                <div className="mt-8 flex justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-kresna-border border-t-primary-500" />
                </div>
              </div>
            ) : success ? (
              /* ── Success State ── */
              <div className="py-8">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-200 animate-scale-in">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-charcoal mb-3">{t('auth.emailVerified')}</h2>
                <p className="text-sm text-kresna-gray-dark leading-relaxed">
                  {t('auth.emailVerifiedRedirect')}
                </p>
                {/* Progress bar for redirect countdown */}
                <div className="mt-8 mx-auto w-32 h-1 rounded-full bg-kresna-light overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full animate-[progress_3s_linear]" style={{ width: '100%' }} />
                </div>
              </div>
            ) : (
              /* ── Error State ── */
              <div className="py-8">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-200 animate-scale-in">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-charcoal mb-3">{t('auth.verificationFailed')}</h2>
                <p className="text-sm text-kresna-gray-dark leading-relaxed mb-8">{error}</p>
                <Button
                  onClick={() => navigate('/auth/signin')}
                  variant="gradient"
                  size="touch"
                  className="shadow-kresna-btn"
                >
                  {t('auth.goToSignIn')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Back to sign in */}
        {!isVerifying && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/auth/signin')}
              className="inline-flex items-center gap-2 text-sm font-medium text-kresna-gray-dark transition-colors hover:text-charcoal min-h-touch"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('auth.backToSignIn')}
            </button>
          </div>
        )}

        {/* Language switcher */}
        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
