/**
 * InspectorTokensPage - Admin Inspector Tokens Management
 * Token list, generate modal, revoke actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  revoked: 'bg-red-50 text-red-700 border-red-200',
};

export default function InspectorTokensPage() {
  const { t } = useTranslation();

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

  // Helper to get org slug from tenant list by org ID
  const getOrgSlug = useCallback((orgId: string): string | undefined => {
    const tenant = tenants.find((t) => t.id === orgId);
    return tenant?.slug;
  }, [tenants]);

  // Fetch tokens across all tenants
  const loadTokens = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(silent);

    try {
      const includeRevoked = statusFilter !== 'active';
      const allTokens: InspectorToken[] = [];

      for (const tenant of tenants) {
        try {
          const response = await fetchInspectorTokens(tenant.slug, { includeRevoked });
          allTokens.push(...(response.tokens || []));
        } catch {
          // Skip tenants we can't access
        }
      }
      setTokens(allTokens);
      if (silent) toast.success('Tokens refreshed');
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, tenants]);

  // Fetch tenants for dropdown
  const loadTenants = useCallback(async () => {
    try {
      const response = await fetchTenants({ limit: 100 });
      setTenants(response.tenants || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  }, []);

  // Load tenants first on mount
  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Load tokens after tenants are available
  useEffect(() => {
    if (tenants.length > 0) {
      loadTokens();
    }
  }, [loadTokens, tenants.length]);

  // Handlers
  const handleRefresh = () => loadTokens(true);

  const handleGenerate = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }

    const orgSlug = getOrgSlug(selectedOrgId);
    if (!orgSlug) {
      toast.error('Could not find organization slug');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateInspectorToken(orgSlug, {
        expires_in_days: parseInt(expiresInDays),
      });
      setGeneratedToken(result.token);
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

    const orgSlug = getOrgSlug(revokeModal.organizationId);
    if (!orgSlug) {
      toast.error('Could not find organization slug');
      return;
    }

    setIsRevoking(true);
    try {
      await revokeInspectorToken(orgSlug, revokeModal.id);
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

  // Filter tokens client-side by search query and status
  const filteredTokens = tokens.filter((token) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!token.organizationName.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && token.status !== statusFilter) {
      return false;
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
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
            <Key className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.inspectorTokens.title')}</h1>
            <p className="text-sm text-zinc-500">Manage ITSS inspector access tokens</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{t('admin.refresh')}</span>
            </Button>
          </div>

          <div>
            <Button
              onClick={() => setShowGenerateModal(true)}
              size="sm"
              className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.inspectorTokens.createToken')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search by organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white shadow-sm pl-9 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <SelectItem value="all" className="text-zinc-700">All Status</SelectItem>
            <SelectItem value="active" className="text-zinc-700">Active</SelectItem>
            <SelectItem value="expired" className="text-zinc-700">Expired</SelectItem>
            <SelectItem value="revoked" className="text-zinc-700">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div
        className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{tokens.length}</span> total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-500">
            <span className="font-medium text-zinc-700">{activeCount}</span> active
          </span>
        </div>
        {expiredCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="text-zinc-500">
              <span className="font-medium text-zinc-700">{expiredCount}</span> expired
            </span>
          </div>
        )}
        {revokedCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-zinc-500">
              <span className="font-medium text-zinc-700">{revokedCount}</span> revoked
            </span>
          </div>
        )}
      </div>

      {/* Tokens grid */}
      <div>
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
            {filteredTokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                onRevoke={() => setRevokeModal(token)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generate Token Modal */}
      <Dialog open={showGenerateModal} onOpenChange={closeGenerateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.inspectorTokens.createToken')}</DialogTitle>
            <DialogDescription>
              Create a new token for ITSS inspectors to access organization data.
            </DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Token Generated</span>
                </div>
                <p className="mb-3 text-xs text-zinc-500">
                  Copy this token now. It won't be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-hidden text-ellipsis rounded bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-900">
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
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    {t('admin.inspectorTokens.tenant')}
                  </label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id} className="text-zinc-700">
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    {t('admin.inspectorTokens.expiresAt')}
                  </label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                      <SelectItem value="7" className="text-zinc-700">7 days</SelectItem>
                      <SelectItem value="14" className="text-zinc-700">14 days</SelectItem>
                      <SelectItem value="30" className="text-zinc-700">30 days</SelectItem>
                      <SelectItem value="90" className="text-zinc-700">90 days</SelectItem>
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
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  {isGenerating ? 'Generating...' : t('common.create')}
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
            <DialogTitle>{t('admin.inspectorTokens.revokeToken')}</DialogTitle>
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
              {isRevoking ? 'Revoking...' : t('common.confirm')}
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
  onRevoke: () => void;
}

function TokenCard({ token, onRevoke }: TokenCardProps) {
  const { t } = useTranslation();
  const isActive = token.status === 'active';
  const daysUntilExpiry = Math.ceil(
    (new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300',
        'hover:border-zinc-300 hover:shadow-md'
      )}
    >
      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
              <Key className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-zinc-900">{token.organizationName}</h3>
              <p className="truncate text-sm text-zinc-500">
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
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Building2 className="h-3.5 w-3.5" />
              {t('admin.inspectorTokens.createdBy')}
            </span>
            <span className="text-zinc-700">{token.createdBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="h-3.5 w-3.5" />
              {t('admin.inspectorTokens.expiresAt')}
            </span>
            <span className={cn(
              'font-medium',
              isActive && daysUntilExpiry <= 7 ? 'text-amber-600' : 'text-zinc-700'
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
              <span className="text-zinc-500">Last used</span>
              <span className="text-zinc-700">
                {new Date(token.lastUsedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Expiry warning */}
        {isActive && daysUntilExpiry <= 7 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Expires soon
            </span>
          </div>
        )}

        {/* Actions */}
        {isActive && (
          <div className="border-t border-zinc-200 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              className="w-full gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
              {t('admin.inspectorTokens.revokeToken')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton
function TokenCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white shadow-sm p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-zinc-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-zinc-100" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-zinc-100" />
        <div className="h-4 w-full rounded bg-zinc-100" />
      </div>
      <div className="border-t border-zinc-200 pt-4">
        <div className="h-8 w-full rounded bg-zinc-100" />
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
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
          <Search className="h-7 w-7 text-zinc-400" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">No matching tokens</h3>
        <p className="mb-4 max-w-sm text-sm text-zinc-500">
          Try adjusting your filters or search query.
        </p>
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="gap-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-16 text-center"
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50"
      >
        <Key className="h-8 w-8 text-amber-600" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-900">{t('admin.inspectorTokens.noTokens')}</h3>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        Generate tokens to allow ITSS inspectors access to organization data.
      </p>
      <div>
        <Button onClick={onGenerate} className="gap-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500">
          <Plus className="h-4 w-4" />
          {t('admin.inspectorTokens.createToken')}
        </Button>
      </div>
    </div>
  );
}
