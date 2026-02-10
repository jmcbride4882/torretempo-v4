import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Briefcase, FileText, Calendar, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface EmployeeOnboardingWizardProps {
  organizationSlug: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface EmployeeFormData {
  // Step 1: Basic Info
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  nationality: string;
  // Step 2: Employment
  job_title: string;
  department: string;
  contract_type: string;
  contract_start: string;
  contract_end: string;
  hours_per_week: number;
  // Step 3: Documents
  dni: string;
  social_security_number: string;
  bank_account: string;
  // Step 4: Schedule
  assigned_location: string;
  preferred_shift: string;
}

const STEPS = [
  { icon: User, key: 'basic' },
  { icon: Briefcase, key: 'employment' },
  { icon: FileText, key: 'documents' },
  { icon: Calendar, key: 'schedule' },
] as const;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function EmployeeOnboardingWizard({ organizationSlug, onComplete, onCancel }: EmployeeOnboardingWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '', email: '', phone: '', date_of_birth: '', nationality: 'ES',
    job_title: '', department: '', contract_type: 'indefinido', contract_start: '', contract_end: '', hours_per_week: 40,
    dni: '', social_security_number: '', bank_account: '',
    assigned_location: '', preferred_shift: '',
  });

  const updateField = (field: keyof EmployeeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/org/${organizationSlug}/employees`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('errors.unexpected'));
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unexpected'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isComplete = i < currentStep;
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center border',
                isActive ? 'bg-primary-50 border-primary-200 text-primary-600' :
                isComplete ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                'bg-zinc-50 border-zinc-200 text-zinc-400'
              )}>
                {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 w-8 sm:w-16', isComplete ? 'bg-emerald-300' : 'bg-zinc-200')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step title */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-900">
          {t(`team.onboarding.step${currentStep + 1}Title`)}
        </h3>
        <p className="text-sm text-zinc-500">{t(`team.onboarding.step${currentStep + 1}Description`)}</p>
      </div>

      {/* Step content */}
      <div className="space-y-4">
        {currentStep === 0 && (
          <>
            <div className="space-y-2">
              <Label>{t('team.fullName')}</Label>
              <Input value={formData.name} onChange={e => updateField('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('team.phone')}</Label>
                <Input type="tel" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('team.dateOfBirth')}</Label>
                <Input type="date" value={formData.date_of_birth} onChange={e => updateField('date_of_birth', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('team.nationality')}</Label>
              <Input value={formData.nationality} onChange={e => updateField('nationality', e.target.value)} />
            </div>
          </>
        )}
        {currentStep === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('team.jobTitle')}</Label>
                <Input value={formData.job_title} onChange={e => updateField('job_title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('team.department')}</Label>
                <Input value={formData.department} onChange={e => updateField('department', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('team.contractType')}</Label>
              <select
                value={formData.contract_type}
                onChange={e => updateField('contract_type', e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                <option value="indefinido">{t('team.contractIndefinido')}</option>
                <option value="temporal">{t('team.contractTemporal')}</option>
                <option value="practicas">{t('team.contractPracticas')}</option>
                <option value="formacion">{t('team.contractFormacion')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('team.contractStart')}</Label>
                <Input type="date" value={formData.contract_start} onChange={e => updateField('contract_start', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('team.contractEnd')}</Label>
                <Input type="date" value={formData.contract_end} onChange={e => updateField('contract_end', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('team.hoursPerWeek')}</Label>
              <Input type="number" min={1} max={40} value={formData.hours_per_week} onChange={e => updateField('hours_per_week', parseInt(e.target.value) || 40)} />
            </div>
          </>
        )}
        {currentStep === 2 && (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {t('team.documentsEncryptedNotice')}
            </div>
            <div className="space-y-2">
              <Label>{t('team.dni')}</Label>
              <Input value={formData.dni} onChange={e => updateField('dni', e.target.value)} placeholder="12345678A" />
            </div>
            <div className="space-y-2">
              <Label>{t('team.socialSecurityNumber')}</Label>
              <Input value={formData.social_security_number} onChange={e => updateField('social_security_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('team.bankAccount')}</Label>
              <Input value={formData.bank_account} onChange={e => updateField('bank_account', e.target.value)} placeholder="ES00 0000 0000 0000 0000" />
            </div>
          </>
        )}
        {currentStep === 3 && (
          <>
            <div className="space-y-2">
              <Label>{t('team.assignedLocation')}</Label>
              <Input value={formData.assigned_location} onChange={e => updateField('assigned_location', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('team.preferredShift')}</Label>
              <select
                value={formData.preferred_shift}
                onChange={e => updateField('preferred_shift', e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                <option value="">{t('common.noPreference')}</option>
                <option value="morning">{t('team.shiftMorning')}</option>
                <option value="afternoon">{t('team.shiftAfternoon')}</option>
                <option value="night">{t('team.shiftNight')}</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
        <Button variant="outline" onClick={currentStep === 0 ? onCancel : handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {currentStep === 0 ? t('common.cancel') : t('common.back')}
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2">
            {t('common.next')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSubmitting ? t('common.saving') : t('team.createEmployee')}
          </Button>
        )}
      </div>
    </div>
  );
}
