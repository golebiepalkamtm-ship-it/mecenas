/**
 * Zakładka: Subskrypcja & Płatności
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Zap } from 'lucide-react';
import type { UserSubscription, Payment, SubscriptionPlan } from '../../../types/profile';
import { cn } from '../../../utils/cn';

interface SubscriptionTabProps {
  subscription: UserSubscription | null;
  payments: Payment[];
  plans: SubscriptionPlan[];
  isLoading?: boolean;
  onUpgradePlan?: (planId: string) => Promise<void>;
  onManageBilling?: () => void;
}

export function SubscriptionTab({
  subscription,
  payments,
  plans,
  isLoading = false,
  onUpgradePlan,
  onManageBilling,
}: SubscriptionTabProps) {
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    setUpgrading(true);
    try {
      await onUpgradePlan?.(planId);
    } finally {
      setUpgrading(false);
    }
  };

  const [nowTimestamp] = useState(() => Date.now());
  const daysUntilRenewal = subscription?.expires_at
    ? Math.ceil(
        (new Date(subscription.expires_at).getTime() - nowTimestamp) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* CURRENT PLAN */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border border-gold-primary/20 rounded-xl bg-linear-to-br from-gold-primary/5 to-transparent"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-black">
                {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
              </h3>
              <p className="text-sm text-black/60 mt-1">
                {subscription.status === 'active' ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    Aktywny · Odnowienie za {daysUntilRenewal} dni
                  </span>
                ) : (
                  <span className="text-red-600">{subscription.status}</span>
                )}
              </p>
            </div>
            {subscription.status === 'active' && (
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest bg-gold-primary/20 text-gold-primary rounded-full">
                Aktywny
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-white/40 rounded-lg">
            <div>
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
                Wznowienie
              </p>
              <p className="text-sm font-semibold text-black mt-1">
                {new Date(subscription.expires_at).toLocaleDateString('pl-PL')}
              </p>
            </div>
            <div>
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
                Cykl
              </p>
              <p className="text-sm font-semibold text-black mt-1">
                {subscription.auto_renew ? 'Miesięczny' : 'Jednorazowy'}
              </p>
            </div>
          </div>

          {subscription.auto_renew && (
            <button
              onClick={onManageBilling}
              className="w-full mt-4 px-4 py-2 text-sm font-semibold text-gold-primary hover:bg-gold-primary/10 rounded-lg transition-colors"
            >
              Zarządzaj metodami płatności
            </button>
          )}
        </motion.div>
      )}

      {/* AVAILABLE PLANS */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-black/70 mb-4">
          Dostępne plany
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan_id === plan.id;
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                className={cn(
                  'p-4 border rounded-xl transition-all',
                  isCurrent
                    ? 'border-gold-primary bg-gold-primary/10'
                    : 'border-black/10 hover:border-gold-primary/50 bg-white'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-bold text-black">{plan.name}</h5>
                    <p className="text-xs text-black/60 mt-1">
                      {plan.price_monthly}€/mies.
                    </p>
                  </div>
                  {isCurrent && <Check size={18} className="text-gold-primary" />}
                </div>

                {/* Features */}
                <ul className="space-y-2 my-4 text-xs">
                  <li className="flex items-center gap-2 text-black/70">
                    <Zap size={14} className="text-gold-primary" />
                    {plan.limits.monthly_tokens.toLocaleString()} tokenów
                  </li>
                  <li className="flex items-center gap-2 text-black/70">
                    <Zap size={14} className="text-gold-primary" />
                    {plan.limits.monthly_chats} czatów
                  </li>
                </ul>

                {!isCurrent && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading || isLoading}
                    className="w-full mt-4 px-3 py-2 text-xs font-semibold bg-gold-primary/20 text-gold-primary hover:bg-gold-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {upgrading ? 'Przetwarzanie...' : 'Wybierz'}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-black/70 mb-4">
          Historia płatności
        </h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border border-black/10 rounded-lg hover:bg-black/2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-gold-primary" />
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {payment.description}
                    </p>
                    <p className="text-xs text-black/60">
                      {new Date(payment.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      payment.status === 'completed' ? 'text-green-600' : 'text-black/60'
                    )}
                  >
                    {payment.status === 'completed' ? '+' : ''}
                    {payment.amount}€
                  </p>
                  <p className="text-xs text-black/50 capitalize">{payment.status}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-black/60 py-8">
              Brak transakcji
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
