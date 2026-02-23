import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Lock, Briefcase, Shield, Info } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth-client';
import { useMyRole } from '@/hooks/useMyRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

interface EmployeeProfile {
  job_title: string;
  employment_type: string;
  contract_start_date: string;
  contract_end_date: string | null;
  working_hours_per_week: number;
  dni_nie: string;
  social_security_number: string;
}

// ============================================================================
// Helper: mask sensitive values (show first 3 + last 1 character)
// ============================================================================

function maskValue(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return value.slice(0, 3) + '*'.repeat(value.length - 4) + value.slice(-1);
}

// ============================================================================
// Profile Page
// ============================================================================

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!slug || !user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kresna-light">
          <User className="h-5 w-5 text-kresna-gray-dark" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            {t('profile.title')}
          </h1>
          <p className="text-sm text-kresna-gray">{t('profile.subtitle')}</p>
        </div>
      </div>

      <AccountInfoSection user={user} />
      <ChangePasswordSection />
      <EmploymentDetailsSection slug={slug} />
    </div>
  );
}

// ============================================================================
// Section 1: Account Information
// ============================================================================

interface AccountInfoSectionProps {
  user: { id: string; name: string; email: string; image?: string | null };
}

function AccountInfoSection({ user }: AccountInfoSectionProps) {
  const { t } = useTranslation();
  const { role } = useMyRole();
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);

  const initial = user.name?.charAt(0)?.toUpperCase() || '?';
  const hasChanged = name.trim() !== user.name;

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || !hasChanged) return;

    setIsSaving(true);
    const result = await authClient.updateUser({ name: trimmed });

    if (result.error) {
      toast.error(result.error.message || t('errors.unexpected'));
    } else {
      toast.success(t('profile.nameUpdated'));
    }
    setIsSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          {t('profile.accountInfo')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-2xl font-bold shadow-kresna-btn">
            {initial}
          </div>
          <div>
            <p className="text-lg font-semibold text-charcoal">{user.name}</p>
            <p className="text-sm text-kresna-gray">{user.email}</p>
          </div>
        </div>

        {/* Name edit */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-kresna-gray-dark block">
            {t('profile.changeName')}
          </label>
          <div className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-11 flex-1"
              placeholder={t('common.name')}
            />
            <Button
              variant="gradient"
              onClick={handleSaveName}
              disabled={isSaving || !hasChanged || !name.trim()}
              loading={isSaving}
              className="rounded-xl"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-kresna-gray-dark block">
            {t('common.email')}
          </label>
          <div className="flex h-11 w-full items-center rounded-xl border border-kresna-border bg-kresna-light px-4 text-sm text-kresna-gray">
            {user.email}
          </div>
        </div>

        {/* Role badge */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-kresna-gray-dark block">
            {t('common.role')}
          </label>
          <Badge variant="secondary" className="capitalize">
            <Shield className="mr-1.5 h-3 w-3" />
            {role || 'member'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Section 2: Change Password
// ============================================================================

function ChangePasswordSection() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    passwordsMatch;

  async function handleChangePassword() {
    if (!isValid) return;

    setIsChanging(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result.error) {
        toast.error(result.error.message || t('errors.unexpected'));
        return;
      }

      toast.success(t('settings.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('errors.unexpected'));
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary-500" />
          {t('profile.changePassword')}
        </CardTitle>
        <p className="text-sm text-kresna-gray">{t('profile.passwordSection')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">
            {t('settings.currentPassword')}
          </label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl h-11"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">
            {t('settings.newPassword')}
          </label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl h-11"
            placeholder={t('settings.atLeast8')}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-kresna-gray-dark block mb-1.5">
            {t('settings.confirmPassword')}
          </label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl h-11"
          />
        </div>

        {newPassword && confirmPassword && !passwordsMatch && (
          <p className="text-xs text-red-600">{t('settings.passwordsNoMatch')}</p>
        )}

        <Button
          variant="gradient"
          onClick={handleChangePassword}
          disabled={isChanging || !isValid}
          loading={isChanging}
          className="rounded-xl"
        >
          {t('profile.changePassword')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Section 3: Employment Details (conditional)
// ============================================================================

function EmploymentDetailsSection({ slug }: { slug: string }) {
  const { t } = useTranslation();

  const { data, isLoading, isError, error } = useQuery<{ employee: EmployeeProfile }>({
    queryKey: ['my-employee-profile', slug],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE}/api/v1/org/${slug}/employees/me`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const status = response.status;
        const body = await response.json().catch(() => ({}));
        const err = new Error(body.message || `Request failed: ${status}`);
        (err as Error & { status: number }).status = status;
        throw err;
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 text-kresna-gray">
            <Briefcase className="h-5 w-5 animate-pulse" />
            <span className="text-sm">{t('common.loading')}...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const is404 = isError && (error as Error & { status?: number })?.status === 404;

  if (is404) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-500" />
            {t('profile.employmentDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-kresna-border bg-kresna-light p-5 flex items-center gap-3">
            <Info className="h-5 w-5 text-kresna-gray shrink-0" />
            <p className="text-sm text-kresna-gray">
              {t('profile.noEmployeeProfile')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data?.employee) {
    return null;
  }

  const emp = data.employee;

  const details: { label: string; value: string }[] = [
    { label: t('team.jobTitle'), value: emp.job_title },
    { label: t('team.contractType'), value: emp.employment_type },
    { label: t('team.contractStart'), value: emp.contract_start_date ? new Date(emp.contract_start_date).toLocaleDateString() : '-' },
    {
      label: t('team.contractEnd') || 'Contract End',
      value: emp.contract_end_date ? new Date(emp.contract_end_date).toLocaleDateString() : '-',
    },
    {
      label: t('team.hoursPerWeek'),
      value: `${emp.working_hours_per_week}h`,
    },
    { label: t('team.dni'), value: maskValue(emp.dni_nie) },
    { label: t('team.ssn'), value: maskValue(emp.social_security_number) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary-500" />
          {t('profile.employmentDetails')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Admin-managed banner */}
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-primary-500 shrink-0" />
          <p className="text-sm text-primary-700">
            {t('profile.adminManaged')}
          </p>
        </div>

        {/* Definition list */}
        <dl className="space-y-4">
          {details.map((item) => (
            <div key={item.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <dt className="text-xs font-medium text-kresna-gray-dark">
                {item.label}
              </dt>
              <dd className="text-sm font-medium text-charcoal">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
