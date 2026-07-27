/**
 * Panel Admin: Analityka & Raporty
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
} from 'lucide-react';
import type { PlatformAnalytics, UsageReport } from '../../../types/admin';

interface AnalyticsPanelProps {
  analytics: PlatformAnalytics[];
  report: UsageReport | null;
  onGenerateReport?: (startDate: string, endDate: string) => Promise<void>;
  onExportReport?: (format: 'pdf' | 'csv' | 'json') => Promise<void>;
  isLoading?: boolean;
}

export function AnalyticsPanel({
  analytics,
  report,
  onGenerateReport,
  onExportReport,
  isLoading = false,
}: AnalyticsPanelProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) return;
    setGenerating(true);
    try {
      await onGenerateReport?.(startDate, endDate);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    setExporting(format);
    try {
      await onExportReport?.(format);
    } finally {
      setExporting(null);
    }
  };

  const latestAnalytics = analytics[analytics.length - 1];

  return (
    <div className="space-y-6">
      {/* KEY METRICS */}
      {latestAnalytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-blue-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              Aktywni dzisiaj
            </p>
            <p className="text-2xl font-bold text-black">
              {latestAnalytics.active_users.toLocaleString('pl-PL')}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-green-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              Czaty dzisiaj
            </p>
            <p className="text-2xl font-bold text-black">
              {latestAnalytics.total_chats.toLocaleString('pl-PL')}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-purple-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              Dokumenty
            </p>
            <p className="text-2xl font-bold text-black">
              {latestAnalytics.total_documents_processed.toLocaleString('pl-PL')}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-4 border border-black/10 rounded-lg bg-linear-to-br from-orange-primary/10 to-transparent"
          >
            <p className="text-xs text-black/60 uppercase tracking-widest font-semibold mb-1">
              Sesja śr.
            </p>
            <p className="text-2xl font-bold text-black">
              {latestAnalytics.average_session_duration.toFixed(0)}
              <span className="text-xs text-black/60"> min</span>
            </p>
          </motion.div>
        </div>
      )}

      {/* REPORT GENERATOR */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-2 border-gold-primary/30 rounded-lg bg-gold-primary/5"
      >
        <h4 className="font-semibold text-black mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-gold-primary" />
          Generator raportów
        </h4>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Od
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Do
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={!startDate || !endDate || generating || isLoading}
            className="w-full px-4 py-2 bg-gold-primary text-black font-semibold rounded-lg hover:bg-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generowanie...' : '📊 Generuj raport'}
          </button>
        </div>
      </motion.div>

      {/* REPORT */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border border-black/10 rounded-lg bg-white/40"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-black">Raport</h4>
            <div className="flex gap-2">
              {['pdf', 'csv', 'json'].map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format as 'pdf' | 'csv' | 'json')}
                  disabled={exporting === format}
                  className="px-3 py-1 text-xs font-semibold bg-gold-primary/20 text-gold-primary hover:bg-gold-primary/30 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Download size={12} />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-black/2 rounded-lg">
            <div>
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
                Użytkownicy
              </p>
              <p className="text-lg font-bold text-black mt-1">
                {report.total_summary.total_users.toLocaleString('pl-PL')}
              </p>
            </div>
            <div>
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
                Aktywni
              </p>
              <p className="text-lg font-bold text-black mt-1">
                {report.total_summary.active_users.toLocaleString('pl-PL')}
              </p>
            </div>
            <div>
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
                Nowi
              </p>
              <p className="text-lg font-bold text-green-600 mt-1">
                +{report.total_summary.new_users.toLocaleString('pl-PL')}
              </p>
            </div>
            <div>
              <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
                Przychód
              </p>
              <p className="text-lg font-bold text-black mt-1">
                €{report.total_summary.total_revenue.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Funnel */}
          {report.conversion_funnel && report.conversion_funnel.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-black mb-3">Funnel konwersji</h5>
              <div className="space-y-2">
                {report.conversion_funnel.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-black">{step.step}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 h-2 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-primary transition-all"
                          style={{
                            width: `${step.conversion_rate * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-black/60 w-12 text-right">
                        {(step.conversion_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Models */}
          {latestAnalytics?.top_models_used && latestAnalytics.top_models_used.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-black mb-3">Popularne modele</h5>
              <div className="space-y-2">
                {latestAnalytics.top_models_used.slice(0, 5).map((model) => (
                  <div key={model.model} className="flex items-center justify-between text-sm">
                    <span className="text-black/70">{model.model}</span>
                    <span className="font-semibold text-black">
                      {model.usage_count.toLocaleString('pl-PL')} użyć
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
