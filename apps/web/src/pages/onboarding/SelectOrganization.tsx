import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Ticket,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useOrganization, type UserOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { OrganizationCard } from '@/components/onboarding/OrganizationCard';
import { JoinOrganizationModal } from '@/components/onboarding/JoinOrganizationModal';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

type LoadingState = 'loading' | 'loaded' | 'error';

export default function SelectOrganization() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { listUserOrganizations, setActiveOrganization } = useOrganization();

  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [selectingOrgId, setSelectingOrgId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const fetchOrganizations = async () => {
    setLoadingState('loading');
    try {
      const orgs = await listUserOrganizations();
      setOrganizations(orgs);
      setLoadingState('loaded');

      if (orgs.length === 0) {
        navigate('/onboarding/create', { replace: true });
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setLoadingState('error');
      toast.error(t('errors.loadFailed'));
    }
  };

  useEffect(() => {
    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectOrganization = async (org: UserOrganization) => {
    setSelectingOrgId(org.id);
    try {
      await setActiveOrganization(org.id);
      toast.success(t('onboarding.switchedTo', { name: org.name }));
      navigate(`/t/${org.slug}/roster`, { replace: true });
    } catch (error) {
      console.error('Failed to select organization:', error);
      toast.error(t('errors.unexpected'));
      setSelectingOrgId(null);
    }
  };

  const handleJoinSuccess = async (organizationId: string) => {
    setShowJoinModal(false);
    const orgs = await listUserOrganizations();
    setOrganizations(orgs);
    const joinedOrg = orgs.find(o => o.id === organizationId);
    if (joinedOrg) {
      navigate(`/t/${joinedOrg.slug}/roster`, { replace: true });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-glow">
              <Clock className="h-7 w-7 text-white" />
            </div>
          </div>

          <p className="text-sm font-medium text-primary-600 mb-3">{t('auth.welcomeBack')}</p>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {user?.name ? `${t('onboarding.hey')}, ${user.name.split(' ')[0]}!` : `${t('auth.welcomeBack')}!`}
          </h1>
          <p className="mt-2 text-slate-500">
            {t('onboarding.selectOrg')}
          </p>
        </div>

        {/* Content */}
        {loadingState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
            <p className="mt-4 text-sm text-slate-500">{t('onboarding.loadingOrgs')}</p>
          </div>
        )}

        {loadingState === 'error' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-900">{t('errors.loadFailed')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('errors.tryAgain')}</p>
            <Button
              onClick={fetchOrganizations}
              variant="outline"
              className="mt-6 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {loadingState === 'loaded' && organizations.length > 0 && (
          <div className="space-y-6">
            {/* Organization list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {t('onboarding.yourOrgs')}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    {organizations.length}
                  </span>
                </h2>
              </div>

              <div className="space-y-2">
                {organizations.map((org, index) => (
                  <OrganizationCard
                    key={org.id}
                    organization={org}
                    onSelect={handleSelectOrganization}
                    isLoading={selectingOrgId === org.id}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-4 text-xs text-slate-400">{t('common.or')}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => setShowJoinModal(true)}
                variant="outline"
                className="h-12 gap-2 min-h-touch"
              >
                <Ticket className="h-4 w-4 text-primary-600" />
                {t('onboarding.joinWithInvitation')}
              </Button>

              <Button
                onClick={() => navigate('/onboarding/create')}
                className="h-12 gap-2 min-h-touch"
              >
                <Plus className="h-4 w-4" />
                {t('onboarding.createOrg')}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>

      <JoinOrganizationModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}
