/**
 * Panel Admin: Zarządzanie Płatnościami
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowUp,
} from 'lucide-react';
import type { PaymentTransaction, RevenueReport, SubscriptionMetrics } from '../../../types/admin';
import { cn } from '../../../utils/cn';

interface PaymentsPanelProps {
  transactions: PaymentTransaction[];
  metrics: SubscriptionMetrics | null;
  report: RevenueReport | null;
  onRefund?: (paymentId: string, amount?: number) => Promise<void>;
  onGenerateReport?: (startDate: string, endDate: string) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentsPanel({
  transactions,
  metrics,
  report,
  onRefund,
  onGenerateReport: _onGenerateReport,
  isLoading = false,
}: PaymentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedPeriod, _setSelectedPeriod] = useState('month');
  const [refunding, setRefunding] = useState<string | null>(null);

  const filteredTransactions = transactions.filter(
    (t) =>
      t.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefund = async (paymentId: string) => {
    setRefunding(paymentId);
    try {
      await onRefund?.(paymentId);
    } finally {
      setRefunding(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KEY METRICS */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-gold-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              MRR
            </p>
            <p className="text-2xl font-bold text-black">
              €{(metrics.mrr / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <ArrowUp size={12} />
              12% vs zeszły miesiąc
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-blue-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              ARR
            </p>
            <p className="text-2xl font-bold text-black">
              €{(metrics.arr / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-black/50 mt-2">Przychód roczny</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-green-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              Subskrypcje
            </p>
            <p className="text-2xl font-bold text-black">
              {metrics.total_active_subscriptions}
            </p>
            <p className="text-xs text-black/50 mt-2">Aktywne</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-red-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              Churn Rate
            </p>
            <p className="text-2xl font-bold text-black">
              {(metrics.churn_rate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <ArrowUp size={12} />
              wzrost
            </p>
          </motion.div>
        </div>
      )}

      {/* REVENUE REPORT */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border border-black/10 rounded-lg bg-white/40"
        >
          <h4 className="font-semibold text-black mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-gold-primary" />
            Raport przychodów
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
                Całkowity przychód
              </p>
              <p className="text-xl font-bold text-black">€{report.total_revenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
                Nowe subskrypcje
              </p>
              <p className="text-xl font-bold text-green-600">+{report.new_subscriptions}</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
                Anulowane
              </p>
              <p className="text-xl font-bold text-red-600">-{report.cancelled_subscriptions}</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
                Średnia transakcja
              </p>
              <p className="text-xl font-bold text-black">€{report.average_transaction_value.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* TRANSACTIONS LIST */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-black/10 rounded-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-black">Transakcje ({filteredTransactions.length})</h4>
          <input
            type="text"
            placeholder="Szukaj emaila lub opisu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 text-sm border border-black/10 rounded-lg focus:outline-none focus:border-gold-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-black/60 uppercase tracking-widest font-semibold border-b border-black/10">
                <th className="text-left py-3 px-3">Email</th>
                <th className="text-left py-3 px-3">Opis</th>
                <th className="text-left py-3 px-3">Kwota</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-left py-3 px-3">Data</th>
                <th className="text-left py-3 px-3">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-black/2 transition-colors"
                >
                  <td className="py-3 px-3 text-sm text-black/80">{transaction.user_email}</td>
                  <td className="py-3 px-3 text-sm text-black/80">{transaction.description}</td>
                  <td className="py-3 px-3 text-sm font-semibold text-black">
                    €{transaction.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-bold rounded-full',
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : transaction.status === 'refunded'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm text-black/60">
                    {new Date(transaction.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="py-3 px-3">
                    {transaction.status === 'completed' && (
                      <button
                        onClick={() => handleRefund(transaction.id)}
                        disabled={refunding === transaction.id || isLoading}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        {refunding === transaction.id ? 'Przetwarzanie...' : 'Zwrot'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
