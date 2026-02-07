import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, UserPlus, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
}

type InviteState = 'idle' | 'loading' | 'success' | 'error';
type MemberRole = 'member' | 'admin' | 'owner';

export function InviteMemberModal({ open, onOpenChange, onSuccess, organizationId }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [state, setState] = useState<InviteState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const result = await authClient.organization.inviteMember({
        email: email.trim(),
        role,
        organizationId,
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to send invitation');
      }
      
      setState('success');
      toast.success(`Invitation sent to ${email.trim()}`);
      
      // Short delay to show success state, then trigger callback
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1200);
    } catch (error) {
      setState('error');
      const message = error instanceof Error ? error.message : 'Failed to send invitation';
      setErrorMessage(message);
      
      // Map common errors to user-friendly messages
      if (message.toLowerCase().includes('already')) {
        setErrorMessage('This user is already a member of the organization.');
      } else if (message.toLowerCase().includes('invalid')) {
        setErrorMessage('Invalid email address or organization.');
      }
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setRole('member');
    setState('idle');
    setErrorMessage('');
    onOpenChange(false);
  };

  const resetState = () => {
    setState('idle');
    setErrorMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-white/10 bg-neutral-900/95 backdrop-blur-xl sm:max-w-md">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
        
        <DialogHeader className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-white/10"
          >
            <AnimatePresence mode="wait">
              {state === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </motion.div>
              ) : state === 'error' ? (
                <motion.div
                  key="error"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <XCircle className="h-8 w-8 text-red-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="userplus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <UserPlus className="h-8 w-8 text-blue-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <DialogTitle className="text-center text-xl text-white">
            {state === 'success' ? 'Invitation Sent!' : 'Invite Team Member'}
          </DialogTitle>
          <DialogDescription className="text-center text-neutral-400">
            {state === 'success' 
              ? 'They will receive an email with instructions to join.'
              : 'Send an invitation to add a new member to your team.'
            }
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {state === 'success' ? (
            <motion.div
              key="success-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-400 ring-1 ring-emerald-500/30"
              >
                <CheckCircle2 className="h-4 w-4" />
                Invitation email sent successfully
              </motion.div>
            </motion.div>
          ) : (
            <motion.form
              key="form-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="relative space-y-6 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state === 'error') resetState();
                    }}
                    className={`pl-10 ${state === 'error' ? 'border-red-500/50 focus:border-red-500' : ''}`}
                    disabled={state === 'loading'}
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                
                {/* Error message */}
                <AnimatePresence>
                  {state === 'error' && errorMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="flex items-center gap-2 text-sm text-red-400"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {errorMessage}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-neutral-300">
                  Role
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as MemberRole)}
                    disabled={state === 'loading'}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-10 py-2.5 text-white transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <p className="text-xs text-neutral-500">
                  Members can view schedules and clock in/out. Admins can manage team and settings. Owners have full access.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={state === 'loading'}
                  className="flex-1 border-white/10 bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={state === 'loading' || !email.trim()}
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {state === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Invitation
                      <Mail className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
