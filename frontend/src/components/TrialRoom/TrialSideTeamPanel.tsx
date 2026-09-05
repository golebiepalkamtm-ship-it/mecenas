import { useState } from 'react';
import { cn } from '../../utils/cn';
import type { TrialSideTeam } from '../../store/useTrialRoomStore';
import type { Model } from '../Chat/types';
import type { TrialSide } from './types';
import { roleLabel } from './trialLabels';
import { SIDE_META } from './trialLabels';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

interface TrialSideTeamPanelProps {
  side: TrialSide;
  roleIds: readonly string[];
  team: TrialSideTeam;
  pool: Model[];
  disabled?: boolean;
  onPatch: (patch: Partial<TrialSideTeam>) => void;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  defender: 'Reprezentuje interes prawny klienta, poszukuje okoliczności łagodzących i buduje linię obrony.',
  proceduralist: 'Analizuje przebieg procedury, terminy, wady formalne pism, błędy organów oraz doręczenia (ZPO/UPO).',
  constitutionalist: 'Ocenia zgodność działań z Konstytucją RP, prawami człowieka (ETPCz) i standardami proporcjonalności.',
  negotiator: 'Koncentruje się na polubownym rozwiązaniu sporu, ugodach, mediacjach i minimalizacji kosztów.',
  evidencecracker: 'Analizuje moc dowodów, wiarygodność świadków, braki w materiale i niespójności.',
  inquisitor: 'Prowadzi agresywne przesłuchanie hipotez, szukając słabych punktów w argumentacji drugiej strony.',
  oracle: 'Skupia się na czystej wykładni przepisów, analizie orzecznictwa sądów najwyższych (SN, NSA) i doktryny.',
  draftsman: 'Przygotowuje precyzyjne projekty pism procesowych, zarzutów, wniosków dowodowych i odwołań.',
  grandmaster: 'Tworzy długofalowy plan taktyczny, przewiduje ruchy przeciwnika i zarządza ryzykiem.',
  prosecutor: 'Formułuje zarzuty, analizuje znamiona czynów zabronionych i reprezentuje oskarżenie.',
  investigator: 'Rekonstruuje stan faktyczny, bada chronologię zdarzeń i gromadzi materiały źródłowe.',
  forensic_expert: 'Przeprowadza specjalistyczną ocenę techniczną, medyczną lub ekonomiczną.',
  hard_judge: 'Dokonuje bezstronnej i surowej oceny szans na sukces w oparciu o zgromadzony materiał.',
  sentencing_expert: 'Analizuje wymiar kary, stopień społecznej szkodliwości i porównuje sprawę z precedensami.',
  navigator: 'Nawiguje po skomplikowanych gałęziach prawa i koordynuje współpracę między agentami.'
};

const ROLE_IMPACTS: Record<string, string> = {
  defender: 'Konstruuje argumenty na korzyść klienta, buduje spójną linię obrony.',
  proceduralist: 'Zwraca uwagę na błędy formalne, terminy procesowe i uchybienia organów.',
  constitutionalist: 'Powołuje się na prawa człowieka, Konstytucję RP i zasady ustrojowe.',
  negotiator: 'Dąży do ugodowego zakończenia sporu i minimalizacji kosztów.',
  evidencecracker: 'Podważa moc dowodów przeciwnika i bada spójność materiału dowodowego.',
  inquisitor: 'Testuje argumenty poprzez prowokacyjne pytania i szukanie sprzeczności.',
  oracle: 'Zapewnia poparcie stanowiska najnowszym orzecznictwem SN, NSA i TSUE.',
  draftsman: 'Formułuje gotowe wnioski dowodowe, zarzuty i żądania w formie pism.',
  grandmaster: 'Planuje taktykę sporu, przewiduje reakcje i minimalizuje ryzyko.',
  prosecutor: 'Precyzuje zarzuty, wykazuje naruszenie norm prawnych i winę.',
  investigator: 'Uporządkowuje fakty, chronologię i odnajduje kluczowe powiązania.',
  forensic_expert: 'Ocenia specjalistyczne zagadnienia techniczne, medyczne i finansowe.',
  hard_judge: 'Wskazuje ryzyka, słabości argumentacji i szanse na wygraną.',
  sentencing_expert: 'Analizuje stopień społecznej szkodliwości i wysokość roszczeń/kar.',
  navigator: 'Koordynuje argumenty pozostałych ekspertów, dbając o jednolity przekaz.'
};

export function TrialSideTeamPanel({
  side,
  roleIds,
  team,
  pool,
  disabled,
  onPatch,
}: TrialSideTeamPanelProps) {
  const meta = SIDE_META[side];
  const accent =
    side === 'defense'
      ? 'border-emerald-500/40 bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.1)]'
      : 'border-rose-500/40 bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.1)]';

  const [activeTooltipRoleId, setActiveTooltipRoleId] = useState<string | null>(null);

  const setRoleModel = (roleId: string, modelId: string) => {
    const others = { ...team.expertRoleByModel };
    for (const [mid, rid] of Object.entries(others)) {
      if (rid === roleId && mid !== modelId) delete others[mid];
    }
    if (modelId) others[modelId] = roleId;
    const models = Object.keys(others);
    onPatch({
      expertRoleByModel: others,
      models,
      judgeModel: team.judgeModel || modelId || models[0] || '',
    });
  };

  const modelForRole = (roleId: string) =>
    Object.entries(team.expertRoleByModel).find(([, r]) => r === roleId)?.[0] ?? '';

  return (
    <div className={cn('rounded-2xl border p-4', accent)}>
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/60 mb-3 drop-shadow-md">
        Zespół — {meta.title}
      </p>
      <div className="space-y-2">
        {roleIds.map((roleId) => (
          <div key={roleId} className="flex flex-col sm:flex-row sm:items-center gap-1.5 relative">
            <div className="flex items-center gap-1.5 sm:w-28 shrink-0">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/70 drop-shadow-md">
                {roleLabel(roleId)}
              </span>
              
              <div className="relative flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onMouseEnter={() => setActiveTooltipRoleId(roleId)}
                  onMouseLeave={() => setActiveTooltipRoleId(null)}
                  className="text-white/40 hover:text-white transition-colors p-0.5 drop-shadow-md"
                  aria-label="Informacje o roli"
                >
                  <Info size={11} />
                </button>
                <AnimatePresence>
                  {activeTooltipRoleId === roleId && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-black/90 border border-white/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-left z-[1000] pointer-events-none"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-gold-primary mb-1">
                        Rola: {roleLabel(roleId)}
                      </p>
                      <p className="text-[8px] leading-relaxed text-white/80 font-bold uppercase tracking-wider mb-1.5">
                        {ROLE_DESCRIPTIONS[roleId] || "Brak opisu."}
                      </p>
                      <p className="text-[7px] leading-relaxed text-emerald-400 font-black uppercase tracking-wider">
                        Wpływ: {ROLE_IMPACTS[roleId] || "Model działa w trybie ogólnym."}
                      </p>
                      <div className="absolute top-full left-2 -mt-px w-2 h-2 bg-black/90 border-r border-b border-white/10 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <select
              value={modelForRole(roleId)}
              disabled={disabled || pool.length === 0}
              onChange={(e) => setRoleModel(roleId, e.target.value)}
              className="flex-1 text-[10px] font-bold rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm px-2 py-1.5 text-white focus:ring-1 focus:ring-gold-primary/50 outline-none"
              aria-label={`Model dla roli ${roleLabel(roleId)}`}
            >
              <option value="" className="bg-[#111] text-white">— wybierz model —</option>
              {pool.map((m) => {
                const assignedRole = team.expertRoleByModel[m.id];
                const isAssignedToOther = assignedRole && assignedRole !== roleId;
                return (
                  <option 
                    key={m.id} 
                    value={m.id} 
                    className="bg-[#111] text-white"
                    disabled={isAssignedToOther}
                  >
                    {m.name || m.id} {isAssignedToOther ? `(przypisany: ${roleLabel(assignedRole)})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>
      <label className="block mt-3 text-[8px] font-black uppercase tracking-widest text-white/60 drop-shadow-md">
        Sędzia syntezy ({meta.short})
      </label>
      <select
        value={team.judgeModel}
        disabled={disabled || pool.length === 0}
        onChange={(e) => onPatch({ judgeModel: e.target.value })}
        className="mt-1 w-full text-[10px] font-bold rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm px-2 py-1.5 text-white focus:ring-1 focus:ring-gold-primary/50 outline-none"
        aria-label={`Sędzia syntezy ${meta.title}`}
      >
        <option value="" className="bg-[#111] text-white">— domyślny z zespołu —</option>
        {pool.map((m) => (
          <option key={m.id} value={m.id} className="bg-[#111] text-white">
            {m.name || m.id}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[7px] text-white/40 uppercase tracking-widest drop-shadow-md">
        {team.models.length}/7 modeli przypisanych
      </p>
    </div>
  );
}
