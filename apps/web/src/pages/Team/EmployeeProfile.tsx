import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Briefcase, Shield, Calendar, Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchEmployee, updateEmployee, type UpdateEmployeeData } from '@/lib/api/employees';
import { useMyRole } from '@/hooks/useMyRole';

export default function EmployeeProfile() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isTenantAdmin } = useMyRole();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<UpdateEmployeeData>({});

  const { data, isLoading } = useQuery({
    queryKey: ['employee', slug, id],
    queryFn: () => fetchEmployee(slug!, id!),
    enabled: !!slug && !!id,
  });

  const emp = data?.employee;

  const startEditing = () => {
    if (!emp) return;
    setEditData({
      dni_nie: emp.dni_nie || '',
      social_security_number: emp.social_security_number || '',
      phone_number: emp.phone_number || '',
      job_title: emp.job_title || '',
      employment_type: emp.employment_type || 'indefinido',
      contract_start_date: emp.contract_start_date || '',
      contract_end_date: emp.contract_end_date || '',
      working_hours_per_week: emp.working_hours_per_week || 40,
      address: emp.address || { street: '', city: '', postal_code: '', country: 'ES' },
      emergency_contact: emp.emergency_contact || { name: '', relationship: '', phone_number: '' },
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!slug || !id) return;
    setIsSaving(true);
    try {
      await updateEmployee(slug, id, editData);
      await queryClient.invalidateQueries({ queryKey: ['employee', slug, id] });
      toast.success(t('profile.profileUpdated', { defaultValue: 'Profile updated' }));
      setIsEditing(false);
      setEditData({});
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.unexpected');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const updateAddress = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      address: { ...((prev.address as any) || { street: '', city: '', postal_code: '', country: 'ES' }), [field]: value },
    }));
  };

  const updateEmergencyContact = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      emergency_contact: { ...((prev.emergency_contact as any) || { name: '', relationship: '', phone_number: '' }), [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const displayVal = (field: keyof UpdateEmployeeData) =>
    isEditing ? ((editData as any)[field] ?? '') : ((emp as any)?.[field] ?? '');

  const addressVal = (field: string) =>
    isEditing
      ? ((editData.address as any)?.[field] ?? '')
      : ((emp?.address as any)?.[field] ?? '');

  const emergencyVal = (field: string) =>
    isEditing
      ? ((editData.emergency_contact as any)?.[field] ?? '')
      : ((emp?.emergency_contact as any)?.[field] ?? '');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/t/${slug}/team`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="page-title">{emp?.job_title || t('team.editProfile')}</h1>
            <p className="page-subtitle">{emp?.employment_type ? t(`team.contractTypes.${emp.employment_type}` as any) : ''}</p>
          </div>
        </div>

        {isTenantAdmin && !isEditing && (
          <Button variant="outline" size="sm" onClick={startEditing} className="gap-2">
            <Pencil className="h-4 w-4" />
            {t('common.edit', { defaultValue: 'Edit' })}
          </Button>
        )}
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
              <InfoRow
                label={t('team.dni')}
                value={displayVal('dni_nie') || '-'}
                isEditing={isEditing}
                onChange={(v) => updateField('dni_nie', v)}
              />
              <InfoRow
                label={t('team.ssn')}
                value={isEditing ? displayVal('social_security_number') : (emp?.social_security_number ? '****' + emp.social_security_number.slice(-4) : '-')}
                isEditing={isEditing}
                onChange={(v) => updateField('social_security_number', v)}
              />
              <InfoRow
                label={t('common.phone')}
                value={displayVal('phone_number') || '-'}
                isEditing={isEditing}
                onChange={(v) => updateField('phone_number', v)}
              />
              <InfoRow
                label={t('common.address')}
                value={isEditing ? addressVal('street') : (emp?.address ? `${emp.address.street}, ${emp.address.city}` : '-')}
                isEditing={isEditing}
                onChange={(v) => updateAddress('street', v)}
                placeholder={t('common.street', { defaultValue: 'Street' })}
              />
              {isEditing && (
                <>
                  <InfoRow
                    label={t('common.city', { defaultValue: 'City' })}
                    value={addressVal('city')}
                    isEditing
                    onChange={(v) => updateAddress('city', v)}
                  />
                  <InfoRow
                    label={t('common.postalCode', { defaultValue: 'Postal code' })}
                    value={addressVal('postal_code')}
                    isEditing
                    onChange={(v) => updateAddress('postal_code', v)}
                  />
                </>
              )}
              <InfoRow
                label={t('team.emergencyContact')}
                value={isEditing ? emergencyVal('name') : (emp?.emergency_contact?.name || '-')}
                isEditing={isEditing}
                onChange={(v) => updateEmergencyContact('name', v)}
              />
              <InfoRow
                label={t('team.emergencyPhone')}
                value={isEditing ? emergencyVal('phone_number') : (emp?.emergency_contact?.phone_number || '-')}
                isEditing={isEditing}
                onChange={(v) => updateEmergencyContact('phone_number', v)}
              />
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
              <InfoRow
                label={t('team.jobTitle')}
                value={displayVal('job_title') || '-'}
                isEditing={isEditing}
                onChange={(v) => updateField('job_title', v)}
              />
              <div className="flex justify-between items-center">
                <dt className="text-sm text-kresna-gray">{t('team.contractType')}</dt>
                <dd>
                  {isEditing ? (
                    <select
                      value={displayVal('employment_type') as string}
                      onChange={(e) => updateField('employment_type', e.target.value)}
                      className="h-9 rounded-xl border border-kresna-border bg-white px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      <option value="indefinido">{t('team.contractTypes.indefinido', { defaultValue: 'Indefinido' })}</option>
                      <option value="temporal">{t('team.contractTypes.temporal', { defaultValue: 'Temporal' })}</option>
                      <option value="practicas">{t('team.contractTypes.practicas', { defaultValue: 'Prácticas' })}</option>
                      <option value="formacion">{t('team.contractTypes.formacion', { defaultValue: 'Formación' })}</option>
                    </select>
                  ) : (
                    <Badge variant="secondary">
                      {t(`team.contractTypes.${emp?.employment_type}` as any) || emp?.employment_type || '-'}
                    </Badge>
                  )}
                </dd>
              </div>
              <InfoRow
                label={t('team.contractStart')}
                value={isEditing
                  ? (displayVal('contract_start_date') as string || '')
                  : (emp?.contract_start_date ? new Date(emp.contract_start_date).toLocaleDateString('es-ES') : '-')
                }
                isEditing={isEditing}
                onChange={(v) => updateField('contract_start_date', v)}
                type="date"
              />
              <InfoRow
                label={t('team.hoursPerWeek')}
                value={isEditing
                  ? String(displayVal('working_hours_per_week') || 40)
                  : `${emp?.working_hours_per_week || 40}h`
                }
                isEditing={isEditing}
                onChange={(v) => updateField('working_hours_per_week', Number(v))}
                type="number"
              />
            </dl>
          </CardContent>
        </Card>

        {/* Leave Balance — always read-only */}
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
                  <span className="text-kresna-gray">{t('team.vacationDays')}</span>
                  <span className="font-medium text-charcoal">
                    {emp?.vacation_days_used || 0} / {emp?.vacation_days_accrued || 22}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-kresna-light overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{
                      width: `${Math.min(100, ((Number(emp?.vacation_days_used) || 0) / (Number(emp?.vacation_days_accrued) || 22)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance — always read-only */}
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
                <dt className="text-sm text-kresna-gray">{t('team.gdprConsent')}</dt>
                <dd>
                  <Badge variant={emp?.data_processing_consent ? 'success' : 'secondary'}>
                    {emp?.data_processing_consent ? t('common.active') : t('common.inactive', { defaultValue: 'Inactive' })}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Save / Cancel footer */}
      {isEditing && (
        <div className="sticky bottom-20 lg:bottom-4 mt-6">
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-kresna-border bg-white/95 backdrop-blur-sm p-4 shadow-kresna">
            <Button variant="outline" onClick={cancelEditing} className="gap-2">
              <X className="h-4 w-4" />
              {t('common.cancel')}
            </Button>
            <Button variant="gradient" onClick={handleSave} loading={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Helper: Display / Edit Row ───── */

function InfoRow({
  label,
  value,
  isEditing,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <dt className="text-sm text-kresna-gray flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-charcoal text-right">
        {isEditing && onChange ? (
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-44 text-right text-sm"
            placeholder={placeholder}
          />
        ) : (
          <span className="max-w-[200px] truncate inline-block">{value}</span>
        )}
      </dd>
    </div>
  );
}
