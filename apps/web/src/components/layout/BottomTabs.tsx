import { useState, useEffect } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  ArrowLeftRight,
  Bell,
  MoreHorizontal,
  Users,
  CalendarPlus,
  CalendarOff,
  ClipboardCheck,
  Copy,
  BarChart3,
  Settings,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPendingSwapsCount } from '@/lib/api/swaps';
import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';

/* ──────────────────────────────────────────────────────────────
   Kresna BottomTabs — Redesigned
   Architecture doc: María (employee) needs:
   - 5 primary tabs (Clock, Schedule, Swaps, Notifications, More)
   - Filled active icons (not outline)
   - Badge indicators for pending counts
   - Giant 60px touch targets
   - Haptic feedback (via CSS active state)
   - Safe area for iPhone notch
   ────────────────────────────────────────────────────────────── */

interface TabItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
  badge?: boolean;
  primary?: boolean;
}

const tabs: TabItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: 'dashboard' },
  { icon: CalendarDays, labelKey: 'nav.roster', path: 'roster' },
  { icon: Clock, labelKey: 'nav.clock', path: 'clock', primary: true },
  { icon: ArrowLeftRight, labelKey: 'nav.swaps', path: 'swaps', badge: true },
  // "More" is rendered separately
];

const moreItems = [
  { icon: Users, labelKey: 'nav.team', path: 'team' },
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
  const location = useLocation();
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

  // Check if any "more" item is active
  const isMoreActive = moreItems.some(item =>
    location.pathname.includes(`/t/${slug}/${item.path}`)
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Frosted glass background */}
        <div className="glass border-t border-kresna-border/50 px-1 pb-safe">
          <div className="flex items-stretch h-[68px]">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/t/${slug}/${tab.path}`}
                className={({ isActive }) =>
                  cn(
                    'group relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200 min-h-touch-lg active:scale-[0.92]',
                    isActive ? 'text-primary-500' : 'text-kresna-gray'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {tab.primary ? (
                      /* Clock tab — elevated pill */
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ease-kresna',
                          isActive
                            ? 'bg-primary-500 shadow-glow scale-110'
                            : 'bg-kresna-light hover:bg-kresna-border'
                        )}
                      >
                        <tab.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-kresna-gray-dark')} />
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <tab.icon
                            className={cn(
                              'h-[22px] w-[22px] transition-colors',
                              isActive ? 'text-primary-500' : 'text-kresna-gray'
                            )}
                          />
                          {/* Badge */}
                          {tab.badge && pendingSwapsCount > 0 && (
                            <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                              {pendingSwapsCount > 9 ? '9+' : pendingSwapsCount}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-medium transition-colors',
                            isActive ? 'text-primary-500' : 'text-kresna-gray'
                          )}
                        >
                          {t(tab.labelKey)}
                        </span>
                      </>
                    )}
                    {/* Active indicator dot */}
                    {isActive && !tab.primary && (
                      <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary-500" />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* More tab */}
            <button
              onClick={moreSheet.open}
              className={cn(
                'group relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200 min-h-touch-lg active:scale-[0.92]',
                isMoreActive ? 'text-primary-500' : 'text-kresna-gray'
              )}
            >
              <MoreHorizontal className={cn(
                'h-[22px] w-[22px] transition-colors',
                isMoreActive ? 'text-primary-500' : ''
              )} />
              <span className={cn(
                'text-[10px] font-medium',
                isMoreActive ? 'text-primary-500' : ''
              )}>
                {t('nav.more')}
              </span>
              {isMoreActive && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary-500" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* More sheet — grid of icons */}
      <BottomSheet
        isOpen={moreSheet.isOpen}
        onClose={moreSheet.close}
        title={t('nav.more')}
        snapPoints={[400]}
      >
        <div className="grid grid-cols-3 gap-3 p-1">
          {moreItems.map((item) => {
            const isActive = location.pathname.includes(`/t/${slug}/${item.path}`);
            return (
              <NavLink
                key={item.path}
                to={`/t/${slug}/${item.path}`}
                onClick={moreSheet.close}
                className={cn(
                  'flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-200 active:scale-[0.95]',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-kresna-gray-dark hover:bg-kresna-light'
                )}
              >
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                  isActive
                    ? 'bg-primary-500 text-white shadow-kresna-btn'
                    : 'bg-kresna-light text-kresna-gray-dark'
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  'text-xs font-medium text-center',
                  isActive ? 'text-primary-600' : ''
                )}>
                  {t(item.labelKey)}
                </span>
              </NavLink>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
