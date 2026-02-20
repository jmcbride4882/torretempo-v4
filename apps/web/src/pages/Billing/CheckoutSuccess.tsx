import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONFETTI_DOTS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: Math.random() * 6 + 4,
  left: Math.random() * 100,
  delay: Math.random() * 2,
  duration: Math.random() * 2 + 3,
  color: ['bg-emerald-400', 'bg-primary-400', 'bg-kresna-border', 'bg-emerald-300', 'bg-primary-300'][
    i % 5
  ],
}));

export default function CheckoutSuccess() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const planName = searchParams.get('plan');

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4">
      {/* Confetti dots */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {CONFETTI_DOTS.map((dot) => (
          <span
            key={dot.id}
            className={`absolute rounded-full opacity-0 ${dot.color}`}
            style={{
              width: dot.size,
              height: dot.size,
              left: `${dot.left}%`,
              top: '-8px',
              animation: `confetti-fall ${dot.duration}s ease-in ${dot.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Success icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-lg shadow-emerald-100/50 animate-bounce-in">
        <CheckCircle className="h-10 w-10 text-emerald-500" strokeWidth={2.5} />
      </div>

      {/* Title */}
      <h1 className="mb-2 text-center text-2xl font-bold text-charcoal">
        {t('billing.checkoutSuccess', { defaultValue: 'Payment successful!' })}
      </h1>

      {/* Subtitle */}
      <p className="mb-2 text-center text-base text-kresna-gray">
        {t('billing.checkoutSuccessDesc', {
          defaultValue: 'Your subscription is now active',
        })}
      </p>

      {/* Plan name */}
      {planName && (
        <p className="mb-8 text-center text-sm font-medium text-primary-600">
          {t('billing.planLabel', { plan: planName, defaultValue: '{{plan}} plan' })}
        </p>
      )}
      {!planName && <div className="mb-8" />}

      {/* CTA buttons */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          onClick={() => navigate(`/t/${slug}/dashboard`)}
          className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md hover:opacity-90"
        >
          {t('billing.goToDashboard', { defaultValue: 'Go to Dashboard' })}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/t/${slug}/billing`)}
          className="w-full border-kresna-border text-kresna-gray-dark hover:bg-kresna-light"
        >
          {t('billing.manageBilling', { defaultValue: 'Manage Billing' })}
        </Button>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translateY(0) rotate(0deg);
          }
          10% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: translateY(calc(70vh + 16px)) rotate(720deg);
          }
        }

        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
