/**
 * Zakładka: Dane & GDPR
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, AlertTriangle, Clock, CheckCircle, Lock } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface DataGDPRTabProps {
  onExportData?: () => Promise<void>;
  onRequestDeletion?: () => Promise<void>;
  lastExportDate?: string;
  deletionPending?: boolean;
  scheduledDeletionDate?: string;
}

export function DataGDPRTab({
  onExportData,
  onRequestDeletion,
  lastExportDate,
  deletionPending,
  scheduledDeletionDate,
}: DataGDPRTabProps) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExportData?.();
    } finally {
      setExporting(false);
    }
  };

  const handleDeletion = async () => {
    setDeleting(true);
    try {
      await onRequestDeletion?.();
      setDeletionConfirmed(false);
      setDeletePassword('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* EKSPORT DANYCH */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-blue-primary/20 rounded-xl bg-linear-to-br from-blue-primary/5 to-transparent"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-black flex items-center gap-2">
              <Download size={20} className="text-blue-primary" />
              Eksport danych (GDPR)
            </h3>
            <p className="text-sm text-black/60 mt-2">
              Pobierz kopię wszystkich swoich danych w formacie JSON
            </p>
          </div>
        </div>

        {lastExportDate && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-white/40 rounded-lg">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm text-black/70">
              Ostatni eksport: {new Date(lastExportDate).toLocaleDateString('pl-PL')}
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-4 py-3 bg-blue-primary text-white font-semibold rounded-lg hover:bg-blue-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <span className="animate-spin">⏳</span>
              Przygotowywanie...
            </>
          ) : (
            <>
              <Download size={18} />
              Pobierz moje dane
            </>
          )}
        </button>

        <div className="mt-4 p-4 bg-blue-primary/10 rounded-lg border border-blue-primary/20">
          <p className="text-xs text-black/70">
            <strong>Co zawiera:</strong> Profil, wiadomości, dokumenty, ustawienia, preferencje, historia płatności.
            Dane są szyfrowane i dostępne przez 7 dni.
          </p>
        </div>
      </motion.div>

      {/* USUNIĘCIE KONTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-2 border-red-primary/30 rounded-xl bg-linear-to-br from-red-primary/5 to-transparent"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle size={20} />
              Usuń konto
            </h3>
            <p className="text-sm text-red-700/70 mt-2">
              {deletionPending
                ? 'Wniosek o usunięcie złożony. Spróbuj zalogować się ponownie, aby anulować.'
                : 'Ta akcja jest nieodwracalna. Wszystkie Twoje dane zostaną permanentnie usunięte.'}
            </p>
          </div>
        </div>

        {deletionPending && scheduledDeletionDate && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Clock size={16} className="text-amber-600" />
            <p className="text-sm text-amber-700">
              Konto zostanie usunięte: {new Date(scheduledDeletionDate).toLocaleDateString('pl-PL')}
            </p>
          </div>
        )}

        {!deletionPending ? (
          <>
            {!deletionConfirmed ? (
              <button
                onClick={() => setDeletionConfirmed(true)}
                className="w-full px-4 py-3 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors"
              >
                Chcę usunąć konto
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-semibold text-red-700">
                  ⚠️ Potwierdź usunięcie konta
                </p>
                <p className="text-xs text-red-600">
                  Wpisz hasło aby potwierdzić trwałe usunięcie. Nie będziesz mieć dostępu do
                  kopii zapasowej.
                </p>

                <input
                  type="password"
                  placeholder="Twoje hasło"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setDeletionConfirmed(false)}
                    className="flex-1 px-3 py-2 border border-black/10 rounded-lg hover:bg-black/5 transition-colors text-sm font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleDeletion}
                    disabled={!deletePassword || deleting}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                      deletePassword && !deleting
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-200 text-red-700 cursor-not-allowed'
                    )}
                  >
                    {deleting ? 'Usuwanie...' : 'Usunąć trwale'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <p className="text-sm font-semibold text-green-700">
                Wniosek o usunięcie został złożony
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* INFO */}
      <div className="p-4 border border-black/10 rounded-lg bg-black/2">
        <p className="text-xs text-black/70 flex items-start gap-2">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <span>
            Twoje dane są szyfrowane end-to-end. GDPR compliance gwarantowany. Możesz pobrać
            dane w każdej chwili.
          </span>
        </p>
      </div>
    </div>
  );
}
