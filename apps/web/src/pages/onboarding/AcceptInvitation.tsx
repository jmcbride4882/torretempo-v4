import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, ArrowRight, UserPlus, Clock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

type AcceptState = 'loading' | 'accepting' | 'success' | 'error' | 'not-logged-in';

export default function AcceptInvitation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { acceptInvitation, setActiveOrganization } = useOrganization();

  const [state, setState] = useState<AcceptState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState('not-logged-in');
      return;
    }

    handleAcceptInvitation();
  }, [user, authLoading, id]);

  const handleAcceptInvitation = async () => {
    if (!id) {
      setErrorMessage(t('onboarding.invalidInvitation'));
      setState('error');
      return;
    }

    setState('accepting');

    try {
      const result = await acceptInvitation(id);
      await setActiveOrganization(result.organizationId);
      setState('success');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setState('error');
      const message = error instanceof Error ? error.message : t('onboarding.invitationFailed');

      if (message.toLowerCase().includes('expired')) {
        setErrorMessage(t('onboarding.invitationExpired'));
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('not found')) {
        setErrorMessage(t('onboarding.invalidInvitation'));
      } else if (message.toLowerCase().includes('already')) {
        setErrorMessage(t('onboarding.alreadyMember'));
      } else {
        setErrorMessage(message);
      }
    }
  };

  const handleSignUpWithInvitation = () => {
    if (id) sessionStorage.setItem('pendingInvitation', id);
    navigate('/auth/signup');
  };

  const handleSignInWithInvitation = () => {
    if (id) sessionStorage.setItem('pendingInvitation', id);
    navigate('/auth/signin');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/20">
            <Clock className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 border border-primary-200">
              {(state === 'loading' || state === 'accepting') ? (
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              ) : state === 'success' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              ) : state === 'error' ? (
                <XCircle className="h-7 w-7 text-red-600" />
              ) : (
                <UserPlus className="h-7 w-7 text-primary-600" />
              )}
            </div>
          </div>

          {/* Loading */}
          {state === 'loading' && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.loadingInvitation')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('onboarding.verifyingInvitation')}</p>
            </div>
          )}

          {/* Accepting */}
          {state === 'accepting' && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.acceptingInvitation')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('onboarding.addingToOrg')}</p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.welcomeAboard')}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('onboarding.joinedRedirect')}
              </p>
              <div className="mt-4 inline-flex">
                <span className="badge-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('onboarding.invitationAccepted')}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.invitationError')}</h2>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => navigate('/auth/signin')}
                  variant="outline"
                  className="h-11"
                >
                  {t('auth.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/auth/signup')}
                  className="h-11"
                >
                  {t('auth.signUp')}
                </Button>
              </div>
            </div>
          )}

          {/* Not logged in */}
          {state === 'not-logged-in' && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.youreInvited')}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t('onboarding.signUpToAccept')}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSignUpWithInvitation}
                  className="w-full h-12 gap-2 min-h-touch"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('onboarding.createAndJoin')}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-slate-400">{t('auth.hasAccount')}</span>
                  </div>
                </div>

                <Button
                  onClick={handleSignInWithInvitation}
                  variant="outline"
                  className="w-full h-11 gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {t('onboarding.signInAndJoin')}
                </Button>
              </div>

              <p className="text-center text-xs text-slate-500">
                {t('onboarding.autoAccept')}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-900 transition-colors">
            {t('common.backToHome')}
          </Link>
        </p>

        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
