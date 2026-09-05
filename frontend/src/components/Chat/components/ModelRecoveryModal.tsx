import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Check, ServerCrash } from 'lucide-react';
import { useModels } from '../../../hooks/useConfig';
import { apiPostJson } from '../../../services/apiClient';

export function ModelRecoveryModal() {
  const [open, setOpen] = useState(false);
  const [imrData, setImrData] = useState<any>(null);
  const [newModel, setNewModel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pobierz dostępne modele z cache/konfiguracji (hook używany w aplikacji do listingu)
  const { data: models = [] } = useModels();
  const curatedModels = models.filter((m) => m.is_curated);

  useEffect(() => {
    const handleActionRequired = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      setImrData(data);
      setOpen(true);
      if (curatedModels.length > 0) {
        setNewModel(curatedModels[0].id);
      }
    };

    window.addEventListener('imr_action_required', handleActionRequired);
    return () => {
      window.removeEventListener('imr_action_required', handleActionRequired);
    };
  }, [curatedModels]);

  const handleSubmit = async () => {
    if (!newModel || !imrData?.resolution_id) return;
    
    setIsSubmitting(true);
    try {
      await apiPostJson('/models/resolve-error', {
        resolution_id: imrData.resolution_id,
        new_model_id: newModel
      });
      setOpen(false);
      setImrData(null);
    } catch (err) {
      console.error("Failed to resolve model error:", err);
      alert("Nie udało się wznowić procesu. Upewnij się, że backend został poprawnie zrestartowany.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && imrData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-zinc-950/90 border border-red-500/30 rounded-2xl shadow-[0_0_100px_rgba(239,68,68,0.15)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-4 p-5 border-b border-red-500/10 bg-red-500/5">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <ServerCrash className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-red-400 truncate tracking-tight">
                  Awaria modelu
                </h2>
                <p className="text-sm text-red-300/80 mt-1 line-clamp-1">
                  Proces zatrzymany z powodu błędu zewnętrznego serwera.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Który model upadł?</span>
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 font-mono text-sm inline-flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{imrData.failed_model}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Szczegóły błędu</span>
                <div className="px-4 py-3 bg-black/50 border border-white/5 rounded-xl text-white/70 font-mono text-xs max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {imrData.error_details || "Brak dodatkowych szczegółów z API."}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-white">
                  Wybierz inny model, aby wznowić zapytanie:
                </span>
                
                <div className="relative group">
                  <select 
                    className="w-full h-12 pl-4 pr-10 appearance-none bg-zinc-900 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-gold-primary/50 focus:ring-1 focus:ring-gold-primary/50 transition-all hover:border-white/20"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                  >
                    <option value="" disabled>-- Wybierz model zastępczy --</option>
                    {curatedModels.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} (Rank: {m.legal_rank || 'N/A'})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 group-hover:text-white/60 transition-colors">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-white/40">
                  Wybrany model zostanie użyty tylko do dokończenia tego zablokowanego żądania.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-5 border-t border-white/5 bg-black/20">
              <button
                onClick={handleSubmit}
                disabled={!newModel || isSubmitting}
                className="relative overflow-hidden flex items-center justify-center gap-2 h-11 px-8 rounded-xl font-bold transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wznawianie...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Wybierz i kontynuuj
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
