import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('es') ? 'es' : 'en';

  return (
    <div className={cn('flex items-center gap-1 rounded-lg bg-slate-100 p-0.5', className)}>
      <button
        onClick={() => i18n.changeLanguage('es')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          currentLang === 'es'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        )}
      >
        ES
      </button>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          currentLang === 'en'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        )}
      >
        EN
      </button>
    </div>
  );
}
