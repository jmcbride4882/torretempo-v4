import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2, Link as LinkIcon, ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

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
  const { t } = useTranslation();
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
      toast.error(t('onboarding.enterName'));
      return;
    }

    if (!slug.trim()) {
      toast.error(t('onboarding.enterSlug'));
      return;
    }

    setIsLoading(true);

    try {
      const org = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
      });

      await setActiveOrganization(org.id);

      toast.success(t('onboarding.orgCreated'));
      navigate(`/t/${org.slug}/dashboard`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      {/* Back button */}
      {cameFromSelection && (
        <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/onboarding/select')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </div>
      )}

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/20">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-zinc-900">
              {t('onboarding.welcome')}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{t('onboarding.setupWorkspace')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-600" />
              {t('onboarding.orgDetails')}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">{t('onboarding.orgDescription')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-700">{t('onboarding.orgName')}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Hotel La Torre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-zinc-700">{t('onboarding.urlSlug')}</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="slug"
                  type="text"
                  placeholder="hotel-la-torre"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <span>URL:</span>
                <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-primary-600 border border-zinc-200">
                  tempo.app/t/{slug || 'tu-org'}
                </code>
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 min-h-touch"
              disabled={isLoading || !name.trim() || !slug.trim()}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  {t('onboarding.createOrg')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
