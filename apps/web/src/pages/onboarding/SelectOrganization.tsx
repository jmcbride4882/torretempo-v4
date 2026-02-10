import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Ticket,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useOrganization, type UserOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { OrganizationCard } from '@/components/onboarding/OrganizationCard';
import { JoinOrganizationModal } from '@/components/onboarding/JoinOrganizationModal';

type LoadingState = 'loading' | 'loaded' | 'error';

export default function SelectOrganization() {
  const navigate = useNavigate();
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
      toast.error('Failed to load your organizations');
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
      toast.success(`Switched to ${org.name}`);
      navigate(`/t/${org.slug}/roster`, { replace: true });
    } catch (error) {
      console.error('Failed to select organization:', error);
      toast.error('Failed to select organization');
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-0 px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary-600/[0.07] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-xl"
      >
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/25">
              <Clock className="h-7 w-7 text-white" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-primary-400 mb-3">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Welcome back</span>
          </div>

          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {user?.name ? `Hey, ${user.name.split(' ')[0]}!` : 'Welcome back!'}
          </h1>
          <p className="mt-2 text-neutral-400">
            Select an organization to continue
          </p>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loadingState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/20 border-t-primary-500" />
              <p className="mt-4 text-sm text-neutral-400">Loading your organizations...</p>
            </motion.div>
          )}

          {loadingState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/20">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">Failed to load organizations</h3>
              <p className="mt-1 text-sm text-neutral-400">Something went wrong. Please try again.</p>
              <Button
                onClick={fetchOrganizations}
                variant="outline"
                className="mt-6 gap-2 rounded-xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </motion.div>
          )}

          {loadingState === 'loaded' && organizations.length > 0 && (
            <motion.div
              key="orgs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Organization list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    <Building2 className="h-3.5 w-3.5" />
                    Your Organizations
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-neutral-400">
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
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface-0 px-4 text-xs text-neutral-600">or</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => setShowJoinModal(true)}
                  variant="outline"
                  className="h-12 gap-2 rounded-xl border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08] min-h-touch"
                >
                  <Ticket className="h-4 w-4 text-primary-400" />
                  Join with Invitation
                </Button>

                <Button
                  onClick={() => navigate('/onboarding/create')}
                  className="h-12 gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium min-h-touch"
                >
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <JoinOrganizationModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}
