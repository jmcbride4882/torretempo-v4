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
  Loader2,
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
      
      // If user has no organizations, redirect to create page
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
    // Refetch organizations to include the newly joined one
    const orgs = await listUserOrganizations();
    setOrganizations(orgs);
    // Find the org we just joined and navigate to it
    const joinedOrg = orgs.find(o => o.id === organizationId);
    if (joinedOrg) {
      navigate(`/t/${joinedOrg.slug}/roster`, { replace: true });
    }
  };

  const handleCreateOrganization = () => {
    navigate('/onboarding/create');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient orbs */}
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary-600/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-600/5 blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 h-[300px] w-[300px] rounded-full bg-emerald-600/5 blur-[80px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Noise texture */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-10 text-center"
        >
          {/* Logo */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-600/30 ring-1 ring-white/20">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Torre Tempo</span>
          </div>
          
          {/* Welcome text */}
          <div className="flex items-center justify-center gap-2 text-primary-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Welcome back</span>
          </div>
          
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            {user?.name ? `Hey, ${user.name.split(' ')[0]}!` : 'Welcome back!'}
          </h1>
          <p className="mt-3 text-lg text-neutral-400">
            Select an organization to continue, or start a new one
          </p>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loadingState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
              <p className="mt-4 text-neutral-400">Loading your organizations...</p>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">Failed to load organizations</h3>
              <p className="mt-1 text-neutral-400">Something went wrong. Please try again.</p>
              <Button
                onClick={fetchOrganizations}
                variant="outline"
                className="mt-6 gap-2 border-white/10 bg-white/5 hover:bg-white/10"
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
              {/* Organizations grid/list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-400">
                    <Building2 className="h-4 w-4" />
                    Your Organizations
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
                      {organizations.length}
                    </span>
                  </h2>
                </div>
                
                <div className="space-y-3">
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
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-neutral-950 px-4 text-sm text-neutral-500">
                    or
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <Button
                  onClick={() => setShowJoinModal(true)}
                  variant="outline"
                  size="lg"
                  className="group relative overflow-hidden border-white/10 bg-white/5 text-white hover:border-primary-500/50 hover:bg-white/10"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  
                  <span className="relative flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary-400" />
                    Join with Invitation
                  </span>
                </Button>
                
                <Button
                  onClick={handleCreateOrganization}
                  size="lg"
                  className="group relative overflow-hidden"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  
                  <span className="relative flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Organization
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Join Organization Modal */}
      <JoinOrganizationModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}
