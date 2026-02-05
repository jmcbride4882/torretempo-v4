import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Building2, Link as LinkIcon, ArrowRight, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

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
  
  // Check if user has existing organizations (to show back button)
  useEffect(() => {
    const checkExistingOrgs = async () => {
      try {
        const orgs = await listUserOrganizations();
        setHasExistingOrgs(orgs.length > 0);
      } catch {
        // Silent fail - just won't show back button
      }
    };
    checkExistingOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Check if came from selection page via state
  const cameFromSelection = location.state?.fromSelection || hasExistingOrgs;

  // Auto-generate slug from name
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-primary-600/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-600/5 blur-[80px]" />
      </div>

      {/* Back button - only show if user has existing organizations */}
      {cameFromSelection && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-6 top-6 z-10"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/onboarding/select')}
            className="gap-2 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Organizations
          </Button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Torre Tempo</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-primary-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Let's set up your workspace</span>
          </div>
        </motion.div>

        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 text-center"
        >
          <h1 className="text-3xl font-bold text-white">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-2 text-neutral-400">
            Create your organization to start managing your team's time
          </p>
        </motion.div>

        <Card className="border-white/5 bg-neutral-900/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-primary-400" />
              Organization details
            </CardTitle>
            <CardDescription>
              This is your company or team workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="name">Organization name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Acme Corporation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="slug">URL slug</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    id="slug"
                    type="text"
                    placeholder="acme-corp"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  <span>Your workspace URL:</span>
                  <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-primary-400">
                    tempo.app/t/{slug || 'your-org'}
                  </code>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-2"
              >
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
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
              </motion.div>
            </form>
          </CardContent>
        </Card>

        {/* Features preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          {[
            { label: 'Time tracking', icon: '⏱️' },
            { label: 'Shift management', icon: '📅' },
            { label: 'Team insights', icon: '📊' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="rounded-lg border border-white/5 bg-neutral-900/50 p-3"
            >
              <span className="text-2xl">{feature.icon}</span>
              <p className="mt-1 text-xs text-neutral-400">{feature.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
