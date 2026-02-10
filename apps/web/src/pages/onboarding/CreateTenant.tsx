import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Building2, Link as LinkIcon, ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export default function CreateTenant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createOrganization, setActiveOrganization, listUserOrganizations } = useOrganization();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingOrgs, setHasExistingOrgs] = useState(false);

  useEffect(() => {
    const checkExistingOrgs = async () => {
      try {
        const orgs = await listUserOrganizations();
        setHasExistingOrgs(orgs.length > 0);
      } catch {
        // Silent fail
      }
    };
    checkExistingOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cameFromSelection = location.state?.fromSelection || hasExistingOrgs;

  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugEdited]);

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    if (!slug.trim()) {
      toast.error('Please enter a URL slug');
      return;
    }

    setIsLoading(true);

    try {
      const org = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
      });

      await setActiveOrganization(org.id);

      toast.success('Organization created successfully!');
      navigate(`/t/${org.slug}/dashboard`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create organization');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary-600/[0.07] blur-[120px]" />
      </div>

      {/* Back button */}
      {cameFromSelection && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/onboarding/select')}
            className="gap-2 text-neutral-500 hover:bg-white/[0.06] hover:text-white rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/25">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Let's set up your workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-400" />
              Organization details
            </h2>
            <p className="text-sm text-neutral-400 mt-1">This is your company or team workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">Organization name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 bg-white/[0.04] border-white/[0.08] rounded-xl"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-neutral-300">URL slug</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  id="slug"
                  type="text"
                  placeholder="acme-corp"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="pl-10 h-11 bg-white/[0.04] border-white/[0.08] rounded-xl"
                  required
                />
              </div>
              <p className="flex items-center gap-1 text-xs text-neutral-500">
                <span>URL:</span>
                <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-primary-400 border border-white/[0.06]">
                  tempo.app/t/{slug || 'your-org'}
                </code>
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium min-h-touch"
              disabled={isLoading || !name.trim() || !slug.trim()}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  Create organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Feature hints */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { label: 'Time tracking', icon: Clock },
            { label: 'Shift mgmt', icon: Building2 },
            { label: 'Team insights', icon: LinkIcon },
          ].map((feature) => (
            <div
              key={feature.label}
              className="glass-card rounded-xl p-3 text-center"
            >
              <feature.icon className="mx-auto h-4 w-4 text-primary-400 mb-1" />
              <p className="text-[10px] text-neutral-500">{feature.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
