// Swap Request Types
// Aligned with backend schema from apps/api/src/db/schema.ts

import type { Shift, TeamMember } from './roster';

export type SwapStatus = 
  | 'pending_peer'      // Waiting for peer/recipient to accept
  | 'pending_manager'   // Peer accepted, waiting for manager approval
  | 'approved'          // Manager approved
  | 'rejected'          // Rejected by peer or manager
  | 'cancelled'         // Cancelled by requester
  | 'completed'         // Swap executed
  | 'expired';          // Request expired without action

export interface SwapRequest {
  id: string;
  organization_id: string;
  
  // The shift being offered by the requester
  offered_shift_id: string;
  offered_shift?: Shift;
  
  // The desired shift (optional - null means "open request")
  desired_shift_id?: string | null;
  desired_shift?: Shift | null;
  
  // Users involved
  requester_id: string;
  requester?: TeamMember;
  
  // Target recipient (optional - null means anyone can claim)
  recipient_id?: string | null;
  recipient?: TeamMember | null;
  
  // Manager who approved/rejected
  manager_id?: string | null;
  manager?: TeamMember | null;
  
  // Status and reason
  status: SwapStatus;
  reason?: string | null;
  
  // Rejection/cancellation details
  rejection_reason?: string | null;
  rejected_by?: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  peer_responded_at?: string | null;
  manager_responded_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
}

// Form data for creating a swap request
export interface CreateSwapRequestData {
  offered_shift_id: string;
  desired_shift_id?: string | null;
  recipient_id?: string | null;
  reason?: string;
}

// Filters for fetching swaps
export interface SwapFilters {
  status?: SwapStatus | SwapStatus[];
  from_date?: string;
  to_date?: string;
  requester_id?: string;
  recipient_id?: string;
}

// API response types
export interface SwapsResponse {
  swaps: SwapRequest[];
  total?: number;
}

export interface SwapResponse {
  swap: SwapRequest;
}

// Action types
export type PeerAction = 'accept' | 'reject';
export type ManagerAction = 'approve' | 'reject';

// Status configuration for UI
export interface SwapStatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  description: string;
}

export const SWAP_STATUS_CONFIG: Record<SwapStatus, SwapStatusConfig> = {
  pending_peer: {
    label: 'Pending Peer',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'Clock',
    description: 'Waiting for peer response',
  },
  pending_manager: {
    label: 'Pending Manager',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'UserCheck',
    description: 'Waiting for manager approval',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'CheckCircle',
    description: 'Swap approved',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'XCircle',
    description: 'Request rejected',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-neutral-400',
    bg: 'bg-neutral-500/10',
    border: 'border-neutral-500/30',
    icon: 'Ban',
    description: 'Cancelled by requester',
  },
  completed: {
    label: 'Completed',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: 'CheckCircle2',
    description: 'Swap completed',
  },
  expired: {
    label: 'Expired',
    color: 'text-neutral-500',
    bg: 'bg-neutral-600/10',
    border: 'border-neutral-600/30',
    icon: 'Clock',
    description: 'Request expired',
  },
};

// Tab definitions
export type SwapTab = 'my-requests' | 'pending-for-me' | 'all';

export interface SwapTabConfig {
  id: SwapTab;
  label: string;
  description: string;
  requiresManager?: boolean;
}

export const SWAP_TABS: SwapTabConfig[] = [
  {
    id: 'my-requests',
    label: 'My Requests',
    description: 'Swaps you have requested',
  },
  {
    id: 'pending-for-me',
    label: 'Pending for Me',
    description: 'Swaps waiting for your response',
  },
  {
    id: 'all',
    label: 'All Swaps',
    description: 'All swap requests in the organization',
    requiresManager: true,
  },
];
