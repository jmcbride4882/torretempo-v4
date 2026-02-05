/**
 * InspectorTokensPage - Admin Inspector Tokens Management
 * Token list, generate modal, revoke actions
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Key,
  RefreshCw,
  Plus,
  Clock,
  XCircle,
  Building2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  fetchInspectorTokens,
  generateInspectorToken,
  revokeInspectorToken,
  fetchTenants,
} from '@/lib/api/admin';
import type { InspectorToken, Tenant } from '@/lib/api/admin';

// Status badge colors
const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  expired: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
  revoked: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function InspectorTokensPage() {
  // State
  const [tokens, setTokens] = useState<InspectorToken[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Revoke modal
  const [revokeModal, setRevokeModal] = useState<InspectorToken | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Fetch tokens
  const loadTokens = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const response = await fetchInspectorTokens({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTokens(response.tokens || []);
      if (silent) toast.success('Tokens refreshed');
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  // Fetch tenants for dropdown
  const loadTenants = useCallback(async () => {
    try {
      const response = await fetchTenants({ limit: 100 });
      setTenants(response.tenants || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  }, []);

  useEffect(() => {
    loadTokens();
    loadTenants();
  }, [loadTokens, loadTenants]);

  // Handlers
  const handleRefresh = () => loadTokens(true);

  const handleGenerate = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateInspectorToken(selectedOrgId, parseInt(expiresInDays));
      setGeneratedToken(result.token.token);
      toast.success('Token generated successfully');
      loadTokens(true);
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Failed to generate token');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToken = async () => {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(generatedToken);
    setCopiedToken(true);
    toast.success('Token copied to clipboard');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeModal) return;

    setIsRevoking(true);
    try {
      await revokeInspectorToken(revokeModal.id);
      toast.success('Token revoked successfully');
      setRevokeModal(null);
      loadTokens(true);
    } catch (error) {
      console.error('Error revoking token:', error);
      toast.error('Failed to revoke token');
    } finally {
      setIsRevoking(false);
    }
  };

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setSelectedOrgId('');
    setExpiresInDays('30');
    setGeneratedToken(null);
    setCopiedToken(false);
  };

  // Filter tokens
  const filteredTokens = tokens.filter((token) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!token.organizationName.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const activeCount = tokens.filter((t) => t.status === 'active').length;
  const expiredCount = tokens.filter((t) => t.status === 'expired').length;
  const revokedCount = tokens.filter((t) => t.status === 'revoked').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600/20 to-teal-600/20 shadow-lg shadow-cyan-500/10">
            <Key className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Inspector Tokens</h1>
            <p className="text-sm text-neutral-400">Manage ITSS inspector access tokens</p>
          </div>
        </div>

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
              onClick={() => setShowGenerateModal(true)}
              size="sm"
              className="gap-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Generate Token</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search by organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-card border-white/10 pl-9 text-white placeholder:text-neutral-500 focus:border-cyan-500"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] glass-card border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            <SelectItem value="all" className="text-neutral-200">All Status</SelectItem>
            <SelectItem value="active" className="text-neutral-200">Active</SelectItem>
            <SelectItem value="expired" className="text-neutral-200">Expired</SelectItem>
            <SelectItem value="revoked" className="text-neutral-200">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{tokens.length}</span> total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-400">
            <span className="font-medium text-neutral-200">{activeCount}</span> active
          </span>
        </div>
        {expiredCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neutral-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-neutral-200">{expiredCount}</span> expired
            </span>
          </div>
        )}
        {revokedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-neutral-400">
              <span className="font-medium text-neutral-200">{revokedCount}</span> revoked
            </span>
          </div>
        )}
      </motion.div>

      {/* Tokens grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <TokenCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTokens.length === 0 ? (
          <EmptyState
            hasFilters={searchQuery !== '' || statusFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            onGenerate={() => setShowGenerateModal(true)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredTokens.map((token, index) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  index={index}
                  onRevoke={() => setRevokeModal(token)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Generate Token Modal */}
      <Dialog open={showGenerateModal} onOpenChange={closeGenerateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Inspector Token</DialogTitle>
            <DialogDescription>
              Create a new token for ITSS inspectors to access organization data.
            </DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Token Generated</span>
                </div>
                <p className="mb-3 text-xs text-neutral-400">
                  Copy this token now. It won't be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-hidden text-ellipsis rounded bg-black/30 px-3 py-2 font-mono text-sm text-white">
                    {generatedToken.slice(0, 32)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyToken}
                    className="gap-1.5"
                  >
                    {copiedToken ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeGenerateModal}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Organization
                  </label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="w-full glass-card border-white/10 text-white">
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id} className="text-neutral-200">
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Expires In
                  </label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger className="w-full glass-card border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="7" className="text-neutral-200">7 days</SelectItem>
                      <SelectItem value="14" className="text-neutral-200">14 days</SelectItem>
                      <SelectItem value="30" className="text-neutral-200">30 days</SelectItem>
                      <SelectItem value="90" className="text-neutral-200">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={closeGenerateModal} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedOrgId}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  {isGenerating ? 'Generating...' : 'Generate Token'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Modal */}
      <Dialog open={!!revokeModal} onOpenChange={() => setRevokeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this token for{' '}
              <strong>{revokeModal?.organizationName}</strong>? The token will no longer be valid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeModal(null)} disabled={isRevoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
              {isRevoking ? 'Revoking...' : 'Revoke Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Token Card Component
interface TokenCardProps {
  token: InspectorToken;
  index: number;
  onRevoke: () => void;
}

function TokenCard({ token, index, onRevoke }: TokenCardProps) {
  const isActive = token.status === 'active';
  const daysUntilExpiry = Math.ceil(
    (new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300',
        'hover:border-white/20 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-cyan-500/5'
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600/20 to-teal-600/20 shadow-lg">
              <Key className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{token.organizationName}</h3>
              <p className="truncate text-sm text-neutral-500">
                Token: {token.token.slice(0, 12)}...
              </p>
            </div>
          </div>
          <Badge className={cn('border', statusColors[token.status])}>
            {token.status}
          </Badge>
        </div>

        {/* Info */}
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Building2 className="h-3.5 w-3.5" />
              Created by
            </span>
            <span className="text-neutral-300">{token.createdBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Clock className="h-3.5 w-3.5" />
              Expires
            </span>
            <span className={cn(
              'font-medium',
              isActive && daysUntilExpiry <= 7 ? 'text-amber-400' : 'text-neutral-300'
            )}>
              {isActive ? (
                daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Today'
              ) : (
                new Date(token.expiresAt).toLocaleDateString()
              )}
            </span>
          </div>
          {token.lastUsedAt && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Last used</span>
              <span className="text-neutral-300">
                {new Date(token.lastUsedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Expiry warning */}
        {isActive && daysUntilExpiry <= 7 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">
              Expires soon
            </span>
          </div>
        )}

        {/* Actions */}
        {isActive && (
          <div className="border-t border-white/5 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              className="w-full gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <XCircle className="h-4 w-4" />
              Revoke Token
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Skeleton
function TokenCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="h-4 w-24 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/10" />
      </div>
      <div className="border-t border-white/5 pt-4">
        <div className="h-8 w-full rounded bg-white/10" />
      </div>
    </div>
  );
}

// Empty State
function EmptyState({
  hasFilters,
  onClearFilters,
  onGenerate,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onGenerate: () => void;
}) {
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
        <h3 className="mb-1 text-lg font-semibold text-white">No matching tokens</h3>
        <p className="mb-4 max-w-sm text-sm text-neutral-400">
          Try adjusting your filters or search query.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5"
        >
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
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600/20 to-teal-600/20"
      >
        <Key className="h-8 w-8 text-cyan-400" />
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold text-white">No inspector tokens</h3>
      <p className="mb-6 max-w-sm text-sm text-neutral-400">
        Generate tokens to allow ITSS inspectors access to organization data.
      </p>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button onClick={onGenerate} className="gap-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500">
          <Plus className="h-4 w-4" />
          Generate Token
        </Button>
      </motion.div>
    </motion.div>
  );
}
