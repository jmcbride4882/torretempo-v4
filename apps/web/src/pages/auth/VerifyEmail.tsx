import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing verification token');
      setIsVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl border border-white/10 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20">
              <Mail className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Email Verification</h1>
            <p className="mt-2 text-sm text-neutral-400">
              {isVerifying ? 'Verifying your email address...' : 'Email verification status'}
            </p>
          </div>

          {/* Status */}
          <div className="text-center">
            {isVerifying ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
                <p className="mt-4 text-sm text-neutral-400">Please wait...</p>
              </motion.div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-white">Email Verified!</h2>
                <p className="mb-6 text-sm text-neutral-400">
                  Your email has been successfully verified. Redirecting to sign in...
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-white">Verification Failed</h2>
                <p className="mb-6 text-sm text-neutral-400">{error}</p>
                <Button
                  onClick={() => navigate('/auth/signin')}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Go to Sign In
                </Button>
              </motion.div>
            )}
          </div>

          {/* Back to sign in */}
          {!isVerifying && (
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/auth/signin')}
                className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Torre Tempo · Workforce Management
        </p>
      </motion.div>
    </div>
  );
}
