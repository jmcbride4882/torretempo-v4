import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, Search, Mail, Shield, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchMembers(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/members`, { credentials: 'include' });
  if (!res.ok) throw new Error('team.fetchMembersError');
  return res.json();
}

async function fetchEmployees(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/employees`, { credentials: 'include' });
  if (!res.ok) throw new Error('team.fetchEmployeesError');
  return res.json();
}

const roleColor: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700 border-amber-200',
  tenantAdmin: 'bg-primary-100 text-primary-700 border-primary-200',
  manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  employee: 'bg-kresna-light text-kresna-gray-dark border-kresna-border',
};

const avatarColors = [
  'bg-primary-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
];

function getAvatarColor(name: string): string {
  const index = (name || '').charCodeAt(0) % avatarColors.length;
  return avatarColors[index] || avatarColors[0]!;
}

export default function TeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'members' | 'profiles'>('members');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const membersQuery = useQuery({
    queryKey: ['members', slug],
    queryFn: () => fetchMembers(slug!),
    enabled: !!slug,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', slug],
    queryFn: () => fetchEmployees(slug!),
    enabled: !!slug && tab === 'profiles',
  });

  const tabs = [
    { key: 'members', label: t('team.members') },
    { key: 'profiles', label: t('team.profiles') },
  ] as const;

  const members = (membersQuery.data?.members || membersQuery.data || []).filter(
    (m: any) => !search || m.user?.name?.toLowerCase().includes(search.toLowerCase()) || m.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const employees = (employeesQuery.data?.employees || []).filter(
    (e: any) => {
      const name = [e.first_name, e.last_name].filter(Boolean).join(' ');
      return !search || name.toLowerCase().includes(search.toLowerCase()) || e.job_title?.toLowerCase().includes(search.toLowerCase());
    }
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal tracking-tight">{t('team.title')}</h1>
            <p className="text-sm text-kresna-gray">{t('team.memberCount', { count: members.length })}</p>
          </div>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          variant="gradient"
          size="sm"
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          {t('team.inviteMember')}
        </Button>
      </div>

      {/* Controls row: Tabs + View toggle + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Pill tabs */}
        <div className="flex gap-1 rounded-full bg-kresna-light p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-full transition-all min-h-touch',
                tab === item.key
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-kresna-gray hover:text-kresna-gray-dark'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle (members tab only) */}
          {tab === 'members' && (
            <div className="flex gap-1 rounded-lg border border-kresna-border bg-white p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-kresna-gray hover:text-charcoal'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-kresna-gray hover:text-charcoal'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-kresna-gray" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl h-10"
            />
          </div>
        </div>
      </div>

      {/* Members tab */}
      {tab === 'members' && (
        <>
          {membersQuery.isLoading ? (
            <div className={cn(
              'gap-4',
              viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'
            )}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-kresna-light border border-kresna-border animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-kresna-border bg-kresna-light px-6 py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <p className="text-lg font-semibold text-charcoal mb-1">{t('team.noMembers')}</p>
              <Button variant="gradient" onClick={() => setInviteOpen(true)} className="gap-1.5 mt-6">
                <UserPlus className="h-4 w-4" />
                {t('team.inviteMember')}
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid view — Card-based */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member: any) => {
                const name = member.user?.name || member.name || '?';
                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(`/t/${slug}/team/${member.userId || member.id}`)}
                    className="group rounded-2xl border border-kresna-border bg-white p-5 shadow-card cursor-pointer hover:shadow-kresna hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full text-white font-semibold text-lg shrink-0',
                        getAvatarColor(name)
                      )}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-charcoal truncate group-hover:text-primary-600 transition-colors">
                          {name}
                        </p>
                        <p className="text-sm text-kresna-gray truncate">
                          {member.user?.email || member.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border',
                        roleColor[member.role] || roleColor.employee
                      )}>
                        {t(`team.roles.${member.role}` as any) || member.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {members.map((member: any) => {
                const name = member.user?.name || member.name || '?';
                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(`/t/${slug}/team/${member.userId || member.id}`)}
                    className="flex items-center gap-4 rounded-2xl border border-kresna-border bg-white p-4 shadow-card cursor-pointer hover:shadow-kresna hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-sm shrink-0',
                      getAvatarColor(name)
                    )}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal truncate">{name}</p>
                      <p className="text-sm text-kresna-gray truncate">{member.user?.email || member.email}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border shrink-0',
                      roleColor[member.role] || roleColor.employee
                    )}>
                      {t(`team.roles.${member.role}` as any) || member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Profiles tab */}
      {tab === 'profiles' && (
        <>
          {employeesQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-kresna-light border border-kresna-border animate-pulse" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-kresna-border bg-kresna-light px-6 py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <p className="text-lg font-semibold text-charcoal mb-1">{t('team.noProfiles')}</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-kresna-border bg-white shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-kresna-border bg-kresna-light/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-kresna-gray uppercase tracking-wider">
                        {t('common.name')}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-kresna-gray uppercase tracking-wider">
                        {t('team.dni')}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-kresna-gray uppercase tracking-wider">
                        {t('team.jobTitle')}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-kresna-gray uppercase tracking-wider">
                        {t('team.contractType')}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-kresna-gray uppercase tracking-wider">
                        {t('team.hoursPerWeek')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kresna-border">
                    {employees.map((emp: any) => {
                      const empName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.user_id;
                      return (
                        <tr
                          key={emp.id}
                          className="cursor-pointer hover:bg-kresna-light/40 transition-colors"
                          onClick={() => navigate(`/t/${slug}/team/${emp.user_id || emp.id}`)}
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-charcoal">{empName}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-kresna-gray font-mono">
                            {'****' + (emp.dni_nie || '').slice(-5)}
                          </td>
                          <td className="px-6 py-4 text-sm text-kresna-gray-dark">{emp.job_title || '-'}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="rounded-full">
                              {t(`team.contractTypes.${emp.employment_type}` as any) || emp.employment_type || '-'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-kresna-gray-dark font-medium">
                            {emp.working_hours_per_week || 40}h
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">{t('team.inviteMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-2 block">
                {t('team.inviteEmail')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-kresna-gray" />
                <Input
                  type="email"
                  placeholder={t('team.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-10 rounded-xl h-12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button variant="gradient" onClick={() => setInviteOpen(false)} className="rounded-xl">
              {t('common.invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
