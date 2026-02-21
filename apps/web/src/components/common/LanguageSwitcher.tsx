import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('es') ? 'es' : 'en';

  return (
    <div className={cn('flex items-center gap-1 rounded-full bg-kresna-light p-0.5', className)}>
      <button
        onClick={() => i18n.changeLanguage('es')}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          currentLang === 'es'
            ? 'bg-white text-charcoal shadow-sm'
            : 'text-kresna-gray hover:text-kresna-gray-dark'
        )}
      >
        ES
      </button>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          currentLang === 'en'
            ? 'bg-white text-charcoal shadow-sm'
            : 'text-kresna-gray hover:text-kresna-gray-dark'
        )}
      >
        EN
      </button>
    </div>
  );
}
