/**
 * BillingPage - Admin Billing Operations
 * Platform admins can create invoices, process refunds, and apply credits
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CreditCard,
  Receipt,
  RefreshCw,
  DollarSign,
  ArrowDownLeft,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  createInvoice,
  processRefund,
  applyCredit,
} from '@/lib/api/admin';

type ModalType = 'invoice' | 'refund' | 'credit' | null;

interface RecentAction {
  id: string;
  type: 'invoice' | 'refund' | 'credit';
  amount: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'failed';
}

export default function BillingPage() {
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

  // Form state
  const [invoiceForm, setInvoiceForm] = useState({ customer_id: '', amount: '', description: '' });
  const [refundForm, setRefundForm] = useState<{
    payment_intent_id: string;
    amount: string;
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | '';
  }>({ payment_intent_id: '', amount: '', reason: '' });
  const [creditForm, setCreditForm] = useState({ customer_id: '', amount: '', description: '' });

  const handleCreateInvoice = async () => {
    if (!invoiceForm.customer_id || !invoiceForm.amount || !invoiceForm.description) {
      toast.error('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvoice({
        customer_id: invoiceForm.customer_id,
        amount: parseFloat(invoiceForm.amount),
        description: invoiceForm.description,
      });
      toast.success('Invoice created successfully');
      setRecentActions(prev => [{
        id: crypto.randomUUID(),
        type: 'invoice',
        amount: invoiceForm.amount,
        description: invoiceForm.description,
        timestamp: new Date(),
        status: 'success',
      }, ...prev]);
      setInvoiceForm({ customer_id: '', amount: '', description: '' });
      setActiveModal(null);
    } catch (error) {
      toast.error('Failed to create invoice');
      setRecentActions(prev => [{
        id: crypto.randomUUID(),
        type: 'invoice',
        amount: invoiceForm.amount,
        description: invoiceForm.description,
        timestamp: new Date(),
        status: 'failed',
      }, ...prev]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundForm.payment_intent_id || !refundForm.reason) {
      toast.error('Payment Intent ID and reason are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await processRefund({
        payment_intent_id: refundForm.payment_intent_id,
        amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
        reason: refundForm.reason,
      });
      toast.success('Refund processed successfully');
      setRecentActions(prev => [{
        id: crypto.randomUUID(),
        type: 'refund',
        amount: refundForm.amount || 'full',
        description: refundForm.reason || 'No reason provided',
        timestamp: new Date(),
        status: 'success',
      }, ...prev]);
      setRefundForm({ payment_intent_id: '', amount: '', reason: '' });
      setActiveModal(null);
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCredit = async () => {
    if (!creditForm.customer_id || !creditForm.amount || !creditForm.description) {
      toast.error('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await applyCredit({
        customer_id: creditForm.customer_id,
        amount: parseFloat(creditForm.amount),
        description: creditForm.description,
      });
      toast.success('Credit applied successfully');
      setRecentActions(prev => [{
        id: crypto.randomUUID(),
        type: 'credit',
        amount: creditForm.amount,
        description: creditForm.description,
        timestamp: new Date(),
        status: 'success',
      }, ...prev]);
      setCreditForm({ customer_id: '', amount: '', description: '' });
      setActiveModal(null);
    } catch (error) {
      toast.error('Failed to apply credit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionCards = [
    {
      title: 'Create Invoice',
      description: 'Generate a manual invoice for a customer',
      icon: Receipt,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      onClick: () => setActiveModal('invoice'),
    },
    {
      title: 'Process Refund',
      description: 'Issue a partial or full refund',
      icon: ArrowDownLeft,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      onClick: () => setActiveModal('refund'),
    },
    {
      title: 'Apply Credit',
      description: 'Add credit to a customer account',
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      onClick: () => setActiveModal('credit'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 shadow-sm">
          <CreditCard className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t('admin.billing.title')}</h1>
          <p className="text-sm text-zinc-500">Manual billing actions for platform admins</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {actionCards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.bgColor)}>
              <card.icon className={cn('h-5 w-5', card.textColor)} />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">{card.title}</h3>
              <p className="text-sm text-zinc-500">{card.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Actions */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Recent Actions</h2>
        {recentActions.length === 0 ? (
          <p className="text-sm text-zinc-500">No billing actions performed this session</p>
        ) : (
          <div className="space-y-3">
            {recentActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      action.type === 'invoice' && 'border-blue-200 text-blue-600',
                      action.type === 'refund' && 'border-amber-200 text-amber-600',
                      action.type === 'credit' && 'border-emerald-200 text-emerald-600'
                    )}
                  >
                    {action.type}
                  </Badge>
                  <span className="text-sm text-zinc-700">{action.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-900">
                    {action.type === 'refund' ? '-' : ''}{t('admin.billing.revenue', { defaultValue: '' })}{action.amount}
                  </span>
                  <Badge variant={action.status === 'success' ? 'default' : 'destructive'}>
                    {action.status}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {action.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <Dialog open={activeModal === 'invoice'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Generate a manual invoice for a Stripe customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Stripe Customer ID</label>
              <Input
                placeholder="cus_..."
                value={invoiceForm.customer_id}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, customer_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Amount (EUR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Description</label>
              <Input
                placeholder="Invoice description..."
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateInvoice} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Refund Modal */}
      <Dialog open={activeModal === 'refund'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>Issue a partial or full refund for a payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Payment Intent ID</label>
              <Input
                placeholder="pi_..."
                value={refundForm.payment_intent_id}
                onChange={(e) => setRefundForm(prev => ({ ...prev, payment_intent_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Amount (EUR, leave empty for full refund)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Full refund"
                value={refundForm.amount}
                onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Reason</label>
              <Select
                value={refundForm.reason}
                onValueChange={(value: 'duplicate' | 'fraudulent' | 'requested_by_customer') =>
                  setRefundForm(prev => ({ ...prev, reason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                  <SelectItem value="duplicate">Duplicate charge</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleProcessRefund} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownLeft className="mr-2 h-4 w-4" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Credit Modal */}
      <Dialog open={activeModal === 'credit'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Credit</DialogTitle>
            <DialogDescription>Add credit balance to a customer account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Stripe Customer ID</label>
              <Input
                placeholder="cus_..."
                value={creditForm.customer_id}
                onChange={(e) => setCreditForm(prev => ({ ...prev, customer_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Amount (EUR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={creditForm.amount}
                onChange={(e) => setCreditForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Description</label>
              <Input
                placeholder="Credit description..."
                value={creditForm.description}
                onChange={(e) => setCreditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleApplyCredit} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
              Apply Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
