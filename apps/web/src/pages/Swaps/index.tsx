import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Filter,
  X,
  Calendar,
  Search,
  Inbox,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SwapCard, SwapCardSkeleton } from '@/components/swaps/SwapCard';
import { RequestSwapModal } from '@/components/swaps/RequestSwapModal';
import { useAuth } from '@/hooks/useAuth';
import { useIsManager } from '@/hooks/useIsManager';
import { cn } from '@/lib/utils';
import type { SwapRequest, SwapStatus, SwapTab, CreateSwapRequestData } from '@/types/swaps';
import type { Shift, TeamMember } from '@/types/roster';
import {
  fetchMySwaps,
  fetchPendingSwaps,
  fetchSwaps,
  createSwapRequest,
  respondToPeer,
  respondAsManager,
  claimOpenSwap,
  cancelSwap,
} from '@/lib/api/swaps';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Tab configuration
const tabs: { id: SwapTab; label: string; icon: typeof Inbox }[] = [
  { id: 'my-requests', label: 'My Requests', icon: ArrowLeftRight },
  { id: 'pending-for-me', label: 'Pending for Me', icon: Clock },
  { id: 'all', label: 'All Swaps', icon: CheckCircle2 },
];

// Status filter options
const statusOptions: { value: SwapStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_peer', label: 'Pending Peer' },
  { value: 'pending_manager', label: 'Pending Manager' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export default function SwapsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<SwapTab>('my-requests');
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<SwapStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = useIsManager();

  // Fetch swaps based on active tab
  const fetchData = useCallback(
    async (silent = false) => {
      if (!slug) return;

      if (!silent) setIsLoading(true);
      setIsRefreshing(silent);

      try {
        let data;
        switch (activeTab) {
          case 'my-requests':
            data = await fetchMySwaps(slug);
            break;
          case 'pending-for-me':
            data = await fetchPendingSwaps(slug);
            break;
          case 'all':
            data = await fetchSwaps(slug);
            break;
        }

        setSwaps(data?.swaps || []);

        if (silent) {
          toast.success('Swaps refreshed');
        }
      } catch (error) {
        console.error('Error fetching swaps:', error);
        toast.error('Failed to load swap requests');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [slug, activeTab]
  );

  // Fetch shifts for the modal
  const fetchShiftsForModal = useCallback(async () => {
    if (!slug) return;

    try {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        start_date: now.toISOString(),
        end_date: thirtyDaysLater.toISOString(),
      });

      const response = await fetch(`${API_URL}/api/v1/org/${slug}/shifts?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const allShifts: Shift[] = data.shifts || [];

        // Separate my shifts from available shifts
        const mine = allShifts.filter((s) => s.user_id === user?.id);
        const others = allShifts.filter((s) => s.user_id && s.user_id !== user?.id);

        setMyShifts(mine);
        setAvailableShifts(others);
      }
    } catch (error) {
      console.error('Error fetching shifts for modal:', error);
    }
  }, [slug, user?.id]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!slug) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/org/${slug}/members`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [slug]);

  // Load data on mount and tab change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load modal data when opening
  useEffect(() => {
    if (showCreateModal) {
      fetchShiftsForModal();
      fetchTeamMembers();
    }
  }, [showCreateModal, fetchShiftsForModal, fetchTeamMembers]);

  // Filter swaps
  const filteredSwaps = swaps.filter((swap) => {
    // Status filter
    if (statusFilter !== 'all' && swap.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesRequester = swap.requester?.name?.toLowerCase().includes(query);
      const matchesRecipient = swap.recipient?.name?.toLowerCase().includes(query);
      const matchesReason = swap.reason?.toLowerCase().includes(query);
      if (!matchesRequester && !matchesRecipient && !matchesReason) {
        return false;
      }
    }

    return true;
  });

  // Handlers
  const handleRefresh = () => fetchData(true);

  const handleTabChange = (tab: SwapTab) => {
    setActiveTab(tab);
    setStatusFilter('all');
    setSearchQuery('');
  };

  const handleCreateSwap = async (data: CreateSwapRequestData) => {
    if (!slug) throw new Error('Organization not found');
    await createSwapRequest(slug, data);
  };

  const handleCreateSuccess = () => {
    fetchData(true);
  };

  const handlePeerAction = async (swapId: string, action: 'accept' | 'reject') => {
    if (!slug) return;
    try {
      await respondToPeer(slug, swapId, action);
      toast.success(action === 'accept' ? 'Swap accepted!' : 'Swap rejected');
      fetchData(true);
    } catch (error) {
      console.error('Error responding to swap:', error);
      toast.error('Failed to respond to swap');
    }
  };

  const handleManagerAction = async (swapId: string, action: 'approve' | 'reject') => {
    if (!slug) return;
    try {
      await respondAsManager(slug, swapId, action);
      toast.success(action === 'approve' ? 'Swap approved!' : 'Swap rejected');
      fetchData(true);
    } catch (error) {
      console.error('Error responding to swap:', error);
      toast.error('Failed to respond to swap');
    }
  };

  const handleClaim = async (swapId: string) => {
    if (!slug) return;
    try {
      await claimOpenSwap(slug, swapId);
      toast.success('Swap claimed!');
      fetchData(true);
    } catch (error) {
      console.error('Error claiming swap:', error);
      toast.error('Failed to claim swap');
    }
  };

  const handleCancel = async (swapId: string) => {
    if (!slug) return;
    try {
      await cancelSwap(slug, swapId);
      toast.success('Swap request cancelled');
      fetchData(true);
    } catch (error) {
      console.error('Error cancelling swap:', error);
      toast.error('Failed to cancel swap');
    }
  };

  // Stats
  const pendingCount = swaps.filter(
    (s) => s.status === 'pending_peer' || s.status === 'pending_manager'
  ).length;
  const approvedCount = swaps.filter((s) => s.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/20 to-violet-600/20 shadow-lg shadow-primary-500/10">
            <ArrowLeftRight className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Shift Swaps</h1>
            <p className="text-sm text-neutral-400">Request and manage shift exchanges</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="gap-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Request Swap</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-1.5"
      >
        <div className="flex gap-1">
          {tabs
            .filter((tab) => tab.id !== 'all' || isManager)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'pending-for-me'
                  ? swaps.filter(
                      (s) =>
                        (s.status === 'pending_peer' && s.recipient_id === user?.id) ||
                        (s.status === 'pending_manager' && isManager)
                    ).length
                  : undefined;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary-600/20 text-primary-300'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                        isActive ? 'bg-primary-500 text-white' : 'bg-white/10 text-neutral-300'
                      )}
                    >
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-lg bg-primary-500/10 ring-1 ring-primary-500/30"
                    />
                  )}
                </button>
              );
            })}
        </div>
      </motion.div>

      {/* Filters bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search swaps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'gap-1.5 rounded-lg border sm:hidden',
              showFilters || statusFilter !== 'all'
                ? 'border-primary-500/30 bg-primary-500/10 text-primary-300'
                : 'border-white/5 bg-white/5 text-neutral-300'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          {/* Desktop filters */}
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as SwapStatus | 'all')}
            >
              <SelectTrigger className="w-[160px] glass-card border-white/10 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-neutral-200">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {statusFilter !== 'all' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="gap-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card overflow-hidden p-4 sm:hidden"
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as SwapStatus | 'all')}
                >
                  <SelectTrigger className="w-full glass-card border-white/10 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-neutral-200">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {statusFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="w-full gap-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-6 text-sm"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{pendingCount}</span> pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{approvedCount}</span> approved
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neutral-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{swaps.length}</span> total
          </span>
        </div>
      </motion.div>

      {/* Swaps grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <SwapCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredSwaps.length === 0 ? (
          <EmptyState
            tab={activeTab}
            hasFilters={statusFilter !== 'all' || searchQuery !== ''}
            onClearFilters={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            onCreateSwap={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filteredSwaps.map((swap) => (
                <SwapCard
                  key={swap.id}
                  swap={swap}
                  currentUserId={user?.id || ''}
                  isManager={isManager}
                  onPeerAction={handlePeerAction}
                  onManagerAction={handleManagerAction}
                  onClaim={handleClaim}
                  onCancel={handleCancel}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create swap modal */}
      <RequestSwapModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
        myShifts={myShifts}
        availableShifts={availableShifts}
        teamMembers={teamMembers}
        organizationSlug={slug || ''}
        onSubmit={handleCreateSwap}
      />
    </div>
  );
}

// Empty state component
function EmptyState({
  tab,
  hasFilters,
  onClearFilters,
  onCreateSwap,
}: {
  tab: SwapTab;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateSwap: () => void;
}) {
  const configs: Record<SwapTab, { icon: typeof Inbox; title: string; description: string }> = {
    'my-requests': {
      icon: ArrowLeftRight,
      title: "You haven't requested any swaps",
      description: 'Need to trade a shift? Request a swap and find a teammate to cover for you.',
    },
    'pending-for-me': {
      icon: Inbox,
      title: 'No swaps pending your response',
      description: "When teammates request swaps with you, they'll appear here.",
    },
    all: {
      icon: Calendar,
      title: 'No swap requests yet',
      description: "When team members request shift swaps, they'll appear here.",
    },
  };

  const config = configs[tab];
  const Icon = config.icon;

  if (hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800/50">
          <Search className="h-7 w-7 text-neutral-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-white">No matching swaps</h3>
        <p className="mb-4 max-w-sm text-sm text-neutral-400">
          Try adjusting your filters or search query to find what you're looking for.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600/20 to-violet-600/20"
      >
        <Icon className="h-8 w-8 text-primary-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">{config.title}</h3>
      <p className="mb-6 max-w-sm text-sm text-neutral-400">{config.description}</p>
      {tab === 'my-requests' && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onCreateSwap}
            className="gap-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500"
          >
            <Plus className="h-4 w-4" />
            Request a Swap
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
