import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SubscriptionStatus {
  isLoading: boolean;
  isTrialing: boolean;
  daysRemaining: number | null;
  isExpired: boolean;
  needsUpgrade: boolean;
  tier: string;
  employeeCount: number;
  employeeLimit: number | null;
  subscriptionStatus: string;
  refetch: () => Promise<void>;
}

const DEFAULT_STATE = {
  isLoading: true,
  isTrialing: false,
  daysRemaining: null,
  isExpired: false,
  needsUpgrade: false,
  tier: 'trial',
  employeeCount: 0,
  employeeLimit: null,
  subscriptionStatus: 'unknown',
} as const;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useSubscription(): SubscriptionStatus {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Omit<SubscriptionStatus, 'refetch'>>({
    ...DEFAULT_STATE,
  });

  const fetchStatus = useCallback(async () => {
    if (!slug) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/org/${slug}/billing/status`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 402) {
          const errorData = await response.json();
          const isTrialExpired = errorData.error === 'trial_expired';
          setData((prev) => ({
            ...prev,
            isLoading: false,
            isExpired: isTrialExpired || errorData.error === 'subscription_inactive',
            needsUpgrade: true,
            subscriptionStatus: isTrialExpired ? 'trial_expired' : 'inactive',
          }));
          return;
        }
        throw new Error('Failed to fetch subscription status');
      }

      const result = await response.json();

      const isTrialing = result.subscriptionStatus === 'trial';
      const isExpired =
        result.subscriptionStatus === 'trial_expired' ||
        result.subscriptionStatus === 'expired' ||
        result.subscriptionStatus === 'cancelled';
      const needsUpgrade = isExpired || result.subscriptionStatus === 'past_due';

      setData({
        isLoading: false,
        isTrialing,
        daysRemaining: result.daysRemaining ?? null,
        isExpired,
        needsUpgrade,
        tier: result.tier || 'trial',
        employeeCount: result.employeeCount || 0,
        employeeLimit: result.employeeLimit ?? null,
        subscriptionStatus: result.subscriptionStatus || 'unknown',
      });
    } catch {
      // Fail open - don't block the UI if billing is unreachable
      setData((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [slug]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { ...data, refetch: fetchStatus };
}
