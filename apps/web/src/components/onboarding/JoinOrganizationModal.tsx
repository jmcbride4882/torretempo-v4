import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Ticket, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
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
import { useOrganization } from '@/hooks/useOrganization';

interface JoinOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (organizationId: string) => void;
}

type JoinState = 'idle' | 'loading' | 'success' | 'error';

export function JoinOrganizationModal({ open, onOpenChange, onSuccess }: JoinOrganizationModalProps) {
  const { acceptInvitation, setActiveOrganization } = useOrganization();
  const [invitationCode, setInvitationCode] = useState('');
  const [state, setState] = useState<JoinState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationCode.trim()) {
      toast.error('Please enter an invitation code');
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const result = await acceptInvitation(invitationCode.trim());
      
      // Set the organization as active
      await setActiveOrganization(result.organizationId);
      
      setState('success');
      toast.success('Successfully joined organization!');
      
      // Short delay to show success state, then trigger callback
      setTimeout(() => {
        onSuccess(result.organizationId);
      }, 1200);
    } catch (error) {
      setState('error');
      const message = error instanceof Error ? error.message : 'Failed to join organization';
      setErrorMessage(message);
      
      // Map common errors to user-friendly messages
      if (message.toLowerCase().includes('expired')) {
        setErrorMessage('This invitation has expired. Please request a new one.');
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('not found')) {
        setErrorMessage('Invalid invitation code. Please check and try again.');
      } else if (message.toLowerCase().includes('already')) {
        setErrorMessage('You are already a member of this organization.');
      }
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setInvitationCode('');
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
      <DialogContent className="border-zinc-200 bg-white sm:max-w-md">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-100 blur-[100px]" />
        
        <DialogHeader className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 ring-1 ring-primary-200"
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
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </motion.div>
              ) : state === 'error' ? (
                <motion.div
                  key="error"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <XCircle className="h-8 w-8 text-red-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="ticket"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Ticket className="h-8 w-8 text-primary-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <DialogTitle className="text-center text-xl text-zinc-900">
            {state === 'success' ? 'Welcome aboard!' : 'Join an Organization'}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            {state === 'success' 
              ? 'You have successfully joined the organization.'
              : 'Enter the invitation code you received to join an existing organization.'
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
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-600 ring-1 ring-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4" />
                Redirecting to your workspace...
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
                <Label htmlFor="invitation-code" className="text-zinc-700">
                  Invitation Code
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="invitation-code"
                    type="text"
                    placeholder="Enter invitation code..."
                    value={invitationCode}
                    onChange={(e) => {
                      setInvitationCode(e.target.value);
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
                      className="flex items-center gap-2 text-sm text-red-500"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {errorMessage}
                    </motion.p>
                  )}
                </AnimatePresence>
                
                <p className="text-xs text-zinc-400">
                  Your organization admin would have sent you an invitation code via email.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={state === 'loading'}
                  className="flex-1 border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={state === 'loading' || !invitationCode.trim()}
                  className="flex-1 gap-2"
                >
                  {state === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Organization
                      <ArrowRight className="h-4 w-4" />
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

export default JoinOrganizationModal;
