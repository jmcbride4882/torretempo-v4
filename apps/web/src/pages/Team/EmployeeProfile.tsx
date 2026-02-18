import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Briefcase, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchEmployee(slug: string, id: string) {
  const res = await fetch(`${API_BASE}/api/v1/org/${slug}/employees/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('team.fetchEmployeeError');
  return res.json();
}

export default function EmployeeProfile() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', slug, id],
    queryFn: () => fetchEmployee(slug!, id!),
    enabled: !!slug && !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const emp = employee || {};

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/t/${slug}/team`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="page-title">{emp.name || t('team.editProfile')}</h1>
          <p className="page-subtitle">{emp.jobTitle || ''}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary-500" />
              {t('team.personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.dni')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.dni || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.ssn')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.ssn ? '****' + emp.ssn.slice(-4) : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('common.phone')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.phone || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('common.address')}</dt>
                <dd className="text-sm font-medium text-slate-900 text-right max-w-[200px]">{emp.address || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.emergencyContact')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.emergencyContact || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.emergencyPhone')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.emergencyPhone || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Employment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary-500" />
              {t('team.employmentInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.jobTitle')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.jobTitle || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.contractType')}</dt>
                <dd>
                  <Badge variant="secondary">
                    {t(`team.contractTypes.${emp.contractType}` as any) || emp.contractType || '-'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.contractStart')}</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('es-ES') : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.salary')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.salary ? `${emp.salary}` : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">{t('team.hoursPerWeek')}</dt>
                <dd className="text-sm font-medium text-slate-900">{emp.hoursPerWeek || 40}h</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary-500" />
              {t('team.leaveBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">{t('team.vacationDays')}</span>
                  <span className="font-medium text-slate-900">18 / 22</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: '18%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary-500" />
              {t('team.compliance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-sm text-slate-500">{t('team.gdprConsent')}</dt>
                <dd><Badge variant="success">{t('common.active')}</Badge></dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
