import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  MoreHorizontal,
  ArrowLeftRight,
  CalendarPlus,
  CalendarOff,
  ClipboardCheck,
  Copy,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';
import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';

const tabs = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: 'dashboard' },
  { icon: CalendarDays, labelKey: 'nav.roster', path: 'roster' },
  { icon: Clock, labelKey: 'nav.clock', path: 'clock', primary: true },
  { icon: Users, labelKey: 'nav.team', path: 'team' },
];

const moreItems = [
  { icon: ArrowLeftRight, labelKey: 'nav.swaps', path: 'swaps' },
  { icon: CalendarPlus, labelKey: 'nav.openShifts', path: 'open-shifts' },
  { icon: CalendarOff, labelKey: 'nav.leave', path: 'leave' },
  { icon: ClipboardCheck, labelKey: 'nav.corrections', path: 'corrections' },
  { icon: Copy, labelKey: 'nav.templates', path: 'shift-templates' },
  { icon: BarChart3, labelKey: 'nav.reportsPage', path: 'reports' },
  { icon: Bell, labelKey: 'nav.notifications', path: 'notifications' },
  { icon: Settings, labelKey: 'nav.settings', path: 'settings' },
  { icon: CreditCard, labelKey: 'nav.billing', path: 'billing' },
];

export function BottomTabs() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);
  const moreSheet = useBottomSheet();

  useEffect(() => {
    if (!slug) return;

    const fetchCount = async () => {
      const count = await fetchPendingSwapsCount(slug);
      setPendingSwapsCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-white border-t border-kresna-border px-1 pb-safe">
          <div className="flex items-stretch h-16">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/t/${slug}/${tab.path}`}
                className={({ isActive }) =>
                  cn(
                    'group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors min-h-touch-lg',
                    isActive ? 'text-primary-500' : 'text-kresna-gray'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {tab.primary ? (
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-2xl transition-all',
                          isActive
                            ? 'bg-primary-500 shadow-md'
                            : 'bg-kresna-light'
                        )}
                      >
                        <tab.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-kresna-gray-dark')} />
                      </div>
                    ) : (
                      <tab.icon
                        className={cn(
                          'h-[22px] w-[22px] transition-colors',
                          isActive ? 'text-primary-500' : 'text-kresna-gray'
                        )}
                      />
                    )}

                    {!tab.primary && (
                      <span
                        className={cn(
                          'text-[10px] font-medium transition-colors',
                          isActive ? 'text-primary-500' : 'text-kresna-gray'
                        )}
                      >
                        {t(tab.labelKey)}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* More tab */}
            <button
              onClick={moreSheet.open}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors min-h-touch-lg text-kresna-gray"
            >
              <MoreHorizontal className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-medium">{t('nav.more')}</span>
              {pendingSwapsCount > 0 && (
                <span className="absolute top-2 right-1/4 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[8px] font-bold text-white">
                  {pendingSwapsCount > 9 ? '9+' : pendingSwapsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* More sheet */}
      <BottomSheet
        isOpen={moreSheet.isOpen}
        onClose={moreSheet.close}
        title={t('nav.more')}
        snapPoints={[400]}
      >
        <div className="grid grid-cols-3 gap-3">
          {moreItems.map((item) => (
            <NavLink
              key={item.path}
              to={`/t/${slug}/${item.path}`}
              onClick={moreSheet.close}
              className="flex flex-col items-center gap-2 rounded-xl p-3 text-kresna-gray-dark hover:bg-kresna-light transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kresna-light">
                <item.icon className="h-5 w-5 text-kresna-gray-dark" />
              </div>
              <span className="text-xs font-medium text-center">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
