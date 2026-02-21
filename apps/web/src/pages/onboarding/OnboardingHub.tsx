import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Ticket, Mail, Clock, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export default function OnboardingHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');

  function handleCodeSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = invitationCode.trim();
    if (!trimmed) return;

    sessionStorage.setItem('pendingInvitation', trimmed);
    navigate('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-kresna-light px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-glow">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-charcoal">
              Torre Tempo
            </h1>
            <p className="mt-1 text-sm text-kresna-gray">
              {t('onboarding.hub.subtitle')}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-kresna-border bg-white p-6 shadow-card space-y-4">
          <h2 className="text-lg font-semibold text-charcoal text-center">
            {t('onboarding.hub.title')}
          </h2>

          {/* Option 1: Create organization */}
          <button
            type="button"
            onClick={() => navigate('/onboarding/create')}
            className="group flex w-full items-start gap-4 rounded-xl border border-kresna-border bg-white p-4 text-left transition-all duration-200 hover:border-primary-300 hover:bg-primary-50/50 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal">
                {t('onboarding.hub.createOrg')}
              </p>
              <p className="mt-0.5 text-xs text-kresna-gray">
                {t('onboarding.hub.createOrgDesc')}
              </p>
            </div>
            <ArrowRight className="mt-2 h-4 w-4 flex-shrink-0 text-kresna-gray transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
          </button>

          {/* Option 2: Have an invitation code */}
          <div className="rounded-xl border border-kresna-border bg-white transition-all duration-200 hover:border-primary-300 hover:shadow-sm">
            <button
              type="button"
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="group flex w-full items-start gap-4 p-4 text-left"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">
                  {t('onboarding.hub.haveInvitation')}
                </p>
                <p className="mt-0.5 text-xs text-kresna-gray">
                  {t('onboarding.hub.haveInvitationDesc')}
                </p>
              </div>
              <ArrowRight
                className={`mt-2 h-4 w-4 flex-shrink-0 text-kresna-gray transition-transform duration-200 ${
                  showCodeInput ? 'rotate-90' : ''
                }`}
              />
            </button>

            {showCodeInput && (
              <form onSubmit={handleCodeSubmit} className="space-y-3 px-4 pb-4">
                <label className="block text-xs font-medium text-kresna-gray-dark">
                  {t('onboarding.hub.enterCode')}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t('onboarding.hub.codePlaceholder')}
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    className="h-11"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!invitationCode.trim()}
                    className="h-11 flex-shrink-0"
                  >
                    {t('onboarding.hub.joinWithCode')}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Option 3: Waiting for invitation */}
          <div className="flex items-start gap-4 rounded-xl border border-kresna-border bg-blue-50/50 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal">
                {t('onboarding.hub.waitingInvitation')}
              </p>
              <p className="mt-0.5 text-xs text-kresna-gray">
                {t('onboarding.hub.waitingInvitationDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-kresna-gray transition-colors hover:text-charcoal"
          >
            <LogOut className="h-4 w-4" />
            {t('common.signOut')}
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
