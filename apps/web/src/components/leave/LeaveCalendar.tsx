import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LeaveBlock {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
}

interface LeaveCalendarProps {
  leaves: LeaveBlock[];
  month: Date;
  className?: string;
}

const typeColors: Record<string, string> = {
  vacation: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sick: 'bg-primary-100 text-primary-700 border-primary-200',
  personal: 'bg-purple-100 text-purple-700 border-purple-200',
  unpaid: 'bg-kresna-light text-kresna-gray-dark border-kresna-border',
};

export function LeaveCalendar({ leaves, month, className }: LeaveCalendarProps) {
  const { t } = useTranslation();

  const daysInMonth = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    return new Date(year, m + 1, 0).getDate();
  }, [month]);

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const approvedLeaves = useMemo(
    () => leaves.filter(l => l.status === 'approved'),
    [leaves]
  );

  const isOnLeave = (employeeName: string, day: number) => {
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return approvedLeaves.find(
      l => l.employeeName === employeeName && l.startDate <= dateStr && l.endDate >= dateStr
    );
  };

  const employees = useMemo(
    () => [...new Set(approvedLeaves.map(l => l.employeeName))],
    [approvedLeaves]
  );

  if (employees.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-kresna-border bg-white p-8 text-center shadow-card', className)}>
        <p className="text-sm text-kresna-gray">{t('leave.noTeamLeave')}</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-kresna-border bg-white overflow-x-auto shadow-card', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-kresna-border bg-kresna-light">
            <th className="sticky left-0 bg-kresna-light px-3 py-2 text-left text-kresna-gray font-medium min-w-[120px]">
              {t('common.employee')}
            </th>
            {days.map(d => (
              <th key={d} className="px-1 py-2 text-center text-kresna-gray font-normal min-w-[28px]">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp} className="border-b border-kresna-border">
              <td className="sticky left-0 bg-white px-3 py-2 text-kresna-gray-dark font-medium truncate max-w-[120px]">{emp}</td>
              {days.map(d => {
                const leave = isOnLeave(emp, d);
                return (
                  <td key={d} className="px-0.5 py-1">
                    {leave && (
                      <div
                        className={cn('h-5 rounded-sm border', typeColors[leave.type] || typeColors.vacation)}
                        title={`${t(`leave.type.${leave.type}`)} - ${emp}`}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
