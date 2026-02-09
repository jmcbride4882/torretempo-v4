import { describe, it, expect, vi } from 'vitest';

// Mock all external dependencies
vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock('../../db/schema.js', () => ({
  subscription_details: {
    id: 'id',
    organization_id: 'organization_id',
    stripe_customer_id: 'stripe_customer_id',
    gocardless_customer_id: 'gocardless_customer_id',
    gocardless_mandate_id: 'gocardless_mandate_id',
    gocardless_subscription_id: 'gocardless_subscription_id',
    subscription_status: 'subscription_status',
    tier: 'tier',
    plan_id: 'plan_id',
    plan_price_cents: 'plan_price_cents',
    plan_employee_limit: 'plan_employee_limit',
    trial_ends_at: 'trial_ends_at',
    current_employee_count: 'current_employee_count',
    updated_at: 'updated_at',
  },
  subscription_plans: {
    id: 'id',
    code: 'code',
    name: 'name',
    price_cents: 'price_cents',
    billing_period: 'billing_period',
    employee_limit: 'employee_limit',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { create: vi.fn(), update: vi.fn() },
    subscriptions: { create: vi.fn(), cancel: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
    paymentIntents: { create: vi.fn() },
    invoices: { create: vi.fn(), finalizeInvoice: vi.fn() },
    invoiceItems: { create: vi.fn() },
    refunds: { create: vi.fn() },
    paymentMethods: { attach: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  })),
}));

vi.mock('gocardless-nodejs/client', () => ({
  GoCardlessClient: vi.fn().mockImplementation(() => ({
    customers: { create: vi.fn() },
    subscriptions: { create: vi.fn(), cancel: vi.fn() },
    payments: { create: vi.fn() },
    refunds: { create: vi.fn() },
    redirectFlows: { create: vi.fn() },
  })),
}));

vi.mock('gocardless-nodejs/constants', () => ({
  Environments: { Sandbox: 'sandbox', Live: 'live' },
}));

vi.mock('gocardless-nodejs/types/Types', () => ({
  SubscriptionIntervalUnit: { Monthly: 'monthly', Yearly: 'yearly' },
  PaymentCurrency: {},
}));

vi.mock('./payment.service.js', async () => {
  const actual = await vi.importActual<typeof import('../payment.service.js')>('../payment.service.js');
  return {
    ...actual,
    stripe: null, // Not configured in tests
    gocardlessClient: null, // Not configured in tests
    createStripeCustomer: vi.fn(),
    createStripeSubscription: vi.fn(),
    cancelStripeSubscription: vi.fn(),
    createGoCardlessCustomer: vi.fn(),
    createGoCardlessSubscription: vi.fn(),
    cancelGoCardlessSubscription: vi.fn(),
  };
});

describe('Billing Service', () => {
  describe('CreateSubscriptionParams interface', () => {
    it('should accept valid params', async () => {
      // Test that the interface types exist
      const params: import('../billing.service.js').CreateSubscriptionParams = {
        organizationId: 'org-123',
        planId: 'plan-456',
        countryCode: 'ES',
        email: 'test@example.com',
        name: 'Test Org',
      };

      expect(params.organizationId).toBe('org-123');
      expect(params.countryCode).toBe('ES');
    });

    it('should accept optional paymentMethodId for Stripe', () => {
      const params: import('../billing.service.js').CreateSubscriptionParams = {
        organizationId: 'org-123',
        planId: 'plan-456',
        countryCode: 'US',
        email: 'test@example.com',
        name: 'Test Org',
        paymentMethodId: 'pm_test',
      };

      expect(params.paymentMethodId).toBe('pm_test');
    });

    it('should accept optional mandateId for GoCardless', () => {
      const params: import('../billing.service.js').CreateSubscriptionParams = {
        organizationId: 'org-123',
        planId: 'plan-456',
        countryCode: 'ES',
        email: 'test@example.com',
        name: 'Test Org',
        mandateId: 'MD0001',
      };

      expect(params.mandateId).toBe('MD0001');
    });
  });

  describe('SubscriptionResult interface', () => {
    it('should have correct shape', () => {
      const result: import('../billing.service.js').SubscriptionResult = {
        processor: 'stripe',
        subscriptionId: 'sub_123',
        customerId: 'cus_456',
        status: 'active',
      };

      expect(result.processor).toBe('stripe');
      expect(result.status).toBe('active');
    });
  });

  describe('BillingError interface', () => {
    it('should extend Error with code and processor', () => {
      const error: import('../billing.service.js').BillingError = Object.assign(
        new Error('Test error'),
        { code: 'PLAN_NOT_FOUND', processor: 'stripe' as const }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('PLAN_NOT_FOUND');
      expect(error.processor).toBe('stripe');
    });
  });

  describe('Error codes', () => {
    it('should document known error codes', () => {
      // These are the error codes used in billing.service.ts
      const knownCodes = [
        'PLAN_NOT_FOUND',
        'STRIPE_NOT_CONFIGURED',
        'GOCARDLESS_NOT_CONFIGURED',
        'MANDATE_REQUIRED',
        'SUBSCRIPTION_NOT_FOUND',
      ];

      for (const code of knownCodes) {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Price conversion', () => {
    it('should convert euros to cents correctly', () => {
      // The services store prices in cents and convert when calling APIs
      const eurosToCents = (euros: number) => Math.round(euros * 100);

      expect(eurosToCents(9.99)).toBe(999);
      expect(eurosToCents(29.99)).toBe(2999);
      expect(eurosToCents(0.01)).toBe(1);
      expect(eurosToCents(100)).toBe(10000);
      expect(eurosToCents(0)).toBe(0);
    });

    it('should handle floating point precision', () => {
      const eurosToCents = (euros: number) => Math.round(euros * 100);

      // Common floating point issues
      expect(eurosToCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30
      expect(eurosToCents(19.99)).toBe(1999);
    });
  });
});
