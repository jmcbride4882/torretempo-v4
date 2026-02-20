import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, Search, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

const roleVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  owner: 'warning',
  tenantAdmin: 'default',
  manager: 'success',
  employee: 'secondary',
};

export default function TeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'members' | 'profiles'>('members');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

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

  const employees = (employeesQuery.data || []).filter(
    (e: any) => !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.jobTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('team.title')}</h1>
          <p className="page-subtitle">{t('team.memberCount', { count: members.length })}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            {t('team.inviteMember')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-kresna-light rounded-lg p-1 w-fit">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === item.key
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-kresna-gray hover:text-kresna-gray-dark'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kresna-gray" />
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members tab */}
      {tab === 'members' && (
        <div className="space-y-2">
          {membersQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users className="h-8 w-8 text-kresna-gray" />
              </div>
              <p className="text-kresna-gray">{t('team.noMembers')}</p>
            </div>
          ) : (
            members.map((member: any) => (
              <Card
                key={member.id}
                className="flex items-center gap-4 p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/t/${slug}/team/${member.userId || member.id}`)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
                  {(member.user?.name || member.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">{member.user?.name || member.name}</p>
                  <p className="text-sm text-kresna-gray truncate">{member.user?.email || member.email}</p>
                </div>
                <Badge variant={roleVariant[member.role] || 'secondary'}>
                  {t(`team.roles.${member.role}` as any) || member.role}
                </Badge>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Profiles tab */}
      {tab === 'profiles' && (
        <div className="space-y-2">
          {employeesQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Shield className="h-8 w-8 text-kresna-gray" />
              </div>
              <p className="text-kresna-gray">{t('team.noProfiles')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('team.dni')}</th>
                    <th>{t('team.jobTitle')}</th>
                    <th>{t('team.contractType')}</th>
                    <th>{t('team.hoursPerWeek')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => (
                    <tr
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/t/${slug}/team/${emp.userId || emp.id}`)}
                    >
                      <td className="font-medium text-charcoal">{emp.name || emp.userId}</td>
                      <td>{'****' + (emp.dni || '').slice(-5)}</td>
                      <td>{emp.jobTitle || '-'}</td>
                      <td>
                        <Badge variant="secondary">
                          {t(`team.contractTypes.${emp.contractType}` as any) || emp.contractType}
                        </Badge>
                      </td>
                      <td>{emp.hoursPerWeek || 40}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.inviteMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-kresna-gray-dark mb-1.5 block">{t('team.inviteEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kresna-gray" />
                <Input
                  type="email"
                  placeholder={t('team.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setInviteOpen(false)}>
              {t('common.invite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
