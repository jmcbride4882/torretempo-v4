import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function SwapsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
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

  // Tab configuration
  const tabs: { id: SwapTab; label: string; icon: typeof Inbox }[] = [
    { id: 'my-requests', label: t('swaps.myRequests'), icon: ArrowLeftRight },
    { id: 'pending-for-me', label: t('swaps.pendingForMe'), icon: Clock },
    { id: 'all', label: t('swaps.allSwaps'), icon: CheckCircle2 },
  ];

  // Status filter options
  const statusOptions: { value: SwapStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('swaps.allStatuses') },
    { value: 'pending_peer', label: t('swaps.pendingPeer') },
    { value: 'pending_manager', label: t('swaps.pendingManager') },
    { value: 'approved', label: t('swaps.approved') },
    { value: 'rejected', label: t('swaps.rejected') },
    { value: 'cancelled', label: t('swaps.cancelled') },
    { value: 'completed', label: t('swaps.completed') },
  ];

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
    if (statusFilter !== 'all' && swap.status !== statusFilter) {
      return false;
    }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <ArrowLeftRight className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              {t('swaps.title')}
            </h1>
            <p className="text-sm text-zinc-500">{t('swaps.subtitle')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{t('swaps.refresh')}</span>
          </Button>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('swaps.requestSwap')}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-zinc-200 bg-white p-1.5">
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
                      ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-200'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                        isActive ? 'bg-primary-600 text-white' : 'bg-zinc-100 text-zinc-600'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder={t('swaps.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border-zinc-200 bg-white pl-9 text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500"
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
                ? 'border-primary-300 bg-primary-50 text-primary-600'
                : 'border-zinc-200 bg-white text-zinc-600'
            )}
          >
            <Filter className="h-4 w-4" />
            {t('common.filters')}
          </Button>

          {/* Desktop filters */}
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as SwapStatus | 'all')}
            >
              <SelectTrigger className="w-[160px] rounded-xl border-zinc-200 bg-white text-zinc-900">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-200 bg-white">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-zinc-700">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {statusFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="gap-1 rounded-lg text-zinc-500 hover:text-zinc-900"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.clear')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:hidden">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                {t('common.status')}
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as SwapStatus | 'all')}
              >
                <SelectTrigger className="w-full rounded-xl border-zinc-200 bg-white text-zinc-900">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-zinc-700">
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
                className="w-full gap-1 rounded-lg text-zinc-500 hover:text-zinc-900"
              >
                <X className="h-3.5 w-3.5" />
                {t('swaps.clearFilters')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-900">{pendingCount}</span> {t('swaps.pending')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-900">{approvedCount}</span> {t('swaps.approved')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-400" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-900">{swaps.length}</span> {t('swaps.total')}
          </span>
        </div>
      </div>

      {/* Swaps grid */}
      <div>
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
          </div>
        )}
      </div>

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
  const { t } = useTranslation();

  const configs: Record<SwapTab, { icon: typeof Inbox; title: string; description: string }> = {
    'my-requests': {
      icon: ArrowLeftRight,
      title: t('swaps.noRequests'),
      description: t('swaps.noRequestsDesc'),
    },
    'pending-for-me': {
      icon: Inbox,
      title: t('swaps.noPending'),
      description: t('swaps.noPendingDesc'),
    },
    all: {
      icon: Calendar,
      title: t('swaps.noSwaps'),
      description: t('swaps.noSwapsDesc'),
    },
  };

  const config = configs[tab];
  const Icon = config.icon;

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
          <Search className="h-7 w-7 text-zinc-400" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">{t('swaps.noMatching')}</h3>
        <p className="mb-4 max-w-sm text-sm text-zinc-500">
          {t('swaps.adjustFilters')}
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
        >
          <X className="h-4 w-4" />
          {t('swaps.clearFilters')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <Icon className="h-8 w-8 text-primary-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-900">{config.title}</h3>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">{config.description}</p>
      {tab === 'my-requests' && (
        <Button
          onClick={onCreateSwap}
          className="gap-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          {t('swaps.requestSwap')}
        </Button>
      )}
    </div>
  );
}
