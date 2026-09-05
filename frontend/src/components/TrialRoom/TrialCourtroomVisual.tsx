import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel,
  Shield,
  Scale,
  BookOpen,
  Scroll,
  Briefcase,
  Users,
  Flame,
  Award,
  Compass,
  BookmarkCheck,
  HelpCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { TrialSideTeam, HearingRound } from '../../store/useTrialRoomStore';
import type { Model } from '../Chat/types';
import type { TrialSide } from './types';
import { roleLabel } from './trialLabels';

interface TrialCourtroomVisualProps {
  defenseTeam: TrialSideTeam;
  prosecutionTeam: TrialSideTeam;
  verdictJudgeModel: string;
  runningPhase: TrialSide | 'hearing' | 'verdict' | null;
  hearingRounds: HearingRound[];
  verdict: string;
  progressMessage: string;
  pool: Model[];
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  defender: 'Reprezentuje interes prawny klienta, poszukuje okoliczności łagodzących i buduje linię obrony.',
  proceduralist: 'Analizuje przebieg procedury, terminy, wady formalne pism, błędy organów oraz doręczenia.',
  constitutionalist: 'Ocenia zgodność działań z Konstytucją RP, prawami człowieka (ETPCz) i standardami proporcjonalności.',
  negotiator: 'Koncentruje się na polubownym rozwiązaniu sporu, ugodach, mediacjach i minimalizacji kosztów.',
  evidencecracker: 'Analizuje moc dowodów, wiarygodność świadków, braki w materiale i niespójności.',
  inquisitor: 'Prowadzi agresywne przesłuchanie hipotez, szukając słabych punktów w argumentacji drugiej strony.',
  oracle: 'Skupia się na czystej wykładni przepisów, analizie orzecznictwa sądów najwyższych (SN, NSA) i doktryny.',
  prosecutor: 'Formułuje zarzuty, analizuje znamiona czynów zabronionych i reprezentuje oskarżenie.',
  investigator: 'Rekonstruuje stan faktyczny, bada chronologię zdarzeń i gromadzi materiały źródłowe.',
  forensic_expert: 'Przeprowadza specjalistyczną ocenę techniczną, medyczną lub ekonomiczną.',
  hard_judge: 'Dokonuje bezstronnej i surowej oceny szans na sukces w oparciu o zgromadzony materiał.',
  sentencing_expert: 'Analizuje wymiar kary, stopień społecznej szkodliwości i porównuje sprawę z precedensami.',
  navigator: 'Koordynuje współpracę między agentami oskarżenia.'
};

const ROLE_IMPACTS: Record<string, string> = {
  defender: 'Buduje spójną linię obrony i wnioski na korzyść klienta.',
  proceduralist: 'Zwraca uwagę na błędy formalne i uchybienia organów.',
  constitutionalist: 'Powołuje się na prawa człowieka, Konstytucję RP i zasady ustrojowe.',
  negotiator: 'Dąży do ugody i obniżenia kosztów procesowych.',
  evidencecracker: 'Podważa moc dowodów przeciwnika.',
  inquisitor: 'Testuje argumenty poprzez prowokacyjne pytania i szukanie sprzeczności.',
  oracle: 'Popiera stanowisko najnowszym orzecznictwem SN, NSA i TSUE.',
  prosecutor: 'Precyzuje zarzuty, wykazuje naruszenie norm prawnych i winę.',
  investigator: 'Uporządkowuje fakty i odnajduje kluczowe powiązania chronologiczne.',
  forensic_expert: 'Ocenia specjalistyczne zagadnienia techniczne i finansowe.',
  hard_judge: 'Wskazuje ryzyka, słabości argumentacji i szanse na wygraną.',
  sentencing_expert: 'Analizuje stopień społecznej szkodliwości i wysokość roszczeń/kar.',
  navigator: 'Koordynuje argumenty ekspertów oskarżenia, dbając o jednolity przekaz.'
};

const ROLE_ICONS: Record<string, any> = {
  defender: Shield,
  constitutionalist: BookOpen,
  proceduralist: Scroll,
  evidencecracker: Briefcase,
  negotiator: Users,
  inquisitor: Flame,
  oracle: Award,
  prosecutor: Scale,
  investigator: Compass,
  forensic_expert: Award,
  hard_judge: Gavel,
  sentencing_expert: BookmarkCheck,
  navigator: Compass
};

export function TrialCourtroomVisual({
  defenseTeam,
  prosecutionTeam,
  verdictJudgeModel,
  runningPhase,
  hearingRounds,
  progressMessage,
  pool
}: TrialCourtroomVisualProps) {
  const [scaleAngle, setScaleAngle] = useState(0);
  const [isGavelStriking, setIsGavelStriking] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{
    roleId: string;
    side: TrialSide;
    roleName: string;
    modelName: string;
    desc: string;
    impact: string;
  } | null>(null);

  // Parse current speaker and status from progressMessage during live simulation
  const parseActiveRoundFromMeta = (msg: string) => {
    const match = msg.match(/Tura\s+(\d+)\/(\d+):\s+(obrona|oskarżenie)/i);
    if (match) {
      return {
        currentRound: parseInt(match[1], 10),
        totalRounds: parseInt(match[2], 10),
        side: match[3].toLowerCase() === 'obrona' ? ('defense' as const) : ('prosecution' as const)
      };
    }
    return null;
  };

  const activeMeta = parseActiveRoundFromMeta(progressMessage);
  const latestRound = hearingRounds.length > 0 ? hearingRounds[hearingRounds.length - 1] : null;

  // Determine current active speaker side and model
  let speakerSide: TrialSide | null = null;
  let speakerModel: string | null = null;
  let speechText: string | null = null;

  if (runningPhase === 'hearing') {
    if (activeMeta) {
      speakerSide = activeMeta.side;
      // Find model assigned to current side
      const team = speakerSide === 'defense' ? defenseTeam : prosecutionTeam;
      // Use the model for this round if known, or fallback to judge model or first model
      speakerModel = latestRound && latestRound.side === speakerSide ? latestRound.model || null : null;
      if (!speakerModel && team.models.length > 0) {
        speakerModel = team.models[0];
      }
      speechText = latestRound && latestRound.side === speakerSide ? latestRound.text : 'Przygotowuję przemówienie...';
    } else if (latestRound) {
      speakerSide = latestRound.side;
      speakerModel = latestRound.model || null;
      speechText = latestRound.text;
    }
  } else if (runningPhase === 'defense') {
    speakerSide = 'defense';
    speechText = 'Zespół obrony analizuje sprawę i buduje strategię procesową...';
  } else if (runningPhase === 'prosecution') {
    speakerSide = 'prosecution';
    speechText = 'Zespół oskarżenia formułuje zarzuty i szuka uchybień formalnych...';
  } else if (runningPhase === 'verdict') {
    speechText = 'Sędzia analizuje stanowiska stron i stenogram z rozprawy. Wydawanie wyroku...';
  }

  // Find role name for speaker model
  let speakerRoleName = '';
  if (speakerSide && speakerModel) {
    const team = speakerSide === 'defense' ? defenseTeam : prosecutionTeam;
    const roleId = team.expertRoleByModel[speakerModel];
    if (roleId) {
      speakerRoleName = roleLabel(roleId);
    }
  }

  // Find model details helper
  const getModelDetails = (side: TrialSide, roleId: string) => {
    const team = side === 'defense' ? defenseTeam : prosecutionTeam;
    const modelId = Object.entries(team.expertRoleByModel).find(([_m, r]) => r === roleId)?.[0] || '';
    const modelObj = pool.find((m) => m.id === modelId);
    return {
      modelId,
      modelName: modelObj ? (modelObj.name || modelObj.id) : 'Brak modelu',
      assigned: !!modelId
    };
  };

  const getJudgeModelName = () => {
    const modelObj = pool.find((m) => m.id === verdictJudgeModel);
    return modelObj ? (modelObj.name || modelObj.id) : 'Gemini 2.5 Flash';
  };

  // Animate the scales of justice depending on active speech/side
  useEffect(() => {
    if (runningPhase === 'hearing') {
      if (speakerSide === 'defense') setScaleAngle(-12);
      else if (speakerSide === 'prosecution') setScaleAngle(12);
      else setScaleAngle(0);
    } else if (runningPhase === 'defense') {
      setScaleAngle(-6);
    } else if (runningPhase === 'prosecution') {
      setScaleAngle(6);
    } else {
      setScaleAngle(0);
    }
  }, [runningPhase, speakerSide]);

  const handleGavelClick = () => {
    if (isGavelStriking) return;
    setIsGavelStriking(true);
    setTimeout(() => {
      setIsGavelStriking(false);
    }, 500);
  };

  // Defense Table seat render helper
  const renderSeat = (side: TrialSide, roleId: string, _idx: number) => {
    const { modelName, assigned, modelId } = getModelDetails(side, roleId);
    const Icon = ROLE_ICONS[roleId] || HelpCircle;
    
    // Check if this specific seat is the active speaker
    const isActiveSpeaker =
      runningPhase === 'hearing' &&
      speakerSide === side &&
      speakerModel === modelId &&
      assigned;

    const isSideGenerating = runningPhase === side;

    return (
      <div
        key={roleId}
        className="relative group flex items-center gap-2 cursor-pointer"
        onMouseEnter={() => {
          setActiveTooltip({
            roleId,
            side,
            roleName: roleLabel(roleId),
            modelName,
            desc: ROLE_DESCRIPTIONS[roleId] || 'Specjalista ds. prawa.',
            impact: ROLE_IMPACTS[roleId] || 'Wspiera analizę i proces.'
          });
        }}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative shadow-inner',
            assigned
              ? side === 'defense'
                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-900/40 text-rose-300 border border-rose-500/30'
              : 'bg-white/5 text-white/20 border border-white/5',
            isActiveSpeaker && 'scale-110 shadow-[0_0_20px_rgba(255,255,255,0.15),inset_0_0_10px_rgba(255,255,255,0.2)] ring-1 ring-white/30 z-10',
            isSideGenerating && 'animate-pulse'
          )}
          style={{
            backdropFilter: 'blur(4px)'
          }}
        >
          {isActiveSpeaker && (
            <span className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-60 border",
              side === 'defense' ? "border-emerald-400" : "border-rose-400"
            )} />
          )}
          <Icon size={18} className={isActiveSpeaker ? 'animate-bounce drop-shadow-md' : 'drop-shadow-sm'} />
        </div>
        <div className="hidden lg:flex flex-col text-left min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/70 truncate drop-shadow-md">
            {roleLabel(roleId)}
          </p>
          <div className="mt-1 text-[8px] text-white/50 font-medium truncate max-w-[100px]" title={modelName}>
            {assigned ? modelName.split('/').pop() : 'Nieobsadzony'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative min-h-[500px] rounded-2xl flex flex-col p-8 overflow-hidden transition-all duration-700 bg-transparent"
    >

      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-[0.9] pointer-events-none z-0">
        <svg
          className="w-20 h-20 text-[#d4af37]"
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))' }}
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M50 15 L45 25 L40 20 L42 35 L30 30 L38 45 L20 40 L35 55 L15 55 L35 65 L25 80 L50 70 L75 80 L65 65 L85 55 L65 55 L80 40 L62 45 L70 30 L58 35 L60 20 L55 25 Z" fill="rgba(212, 175, 55, 0.1)" />
          <circle cx="50" cy="12" r="3" fill="currentColor" />
          <path d="M50 70 L50 90 M40 90 L60 90" strokeWidth="2" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[#d4af37] mt-3 drop-shadow-md">
          Rzeczpospolita Polska
        </span>
      </div>

      <div className="grid grid-cols-[1fr_2fr_1fr] gap-6 min-h-[420px] items-stretch relative z-10 mt-8">
        
        <div className="flex flex-col justify-end items-center pb-4">
          <div
            className={cn(
              'w-full max-w-[170px] rounded-xl p-5 flex flex-col gap-4 relative transition-all duration-700 bg-black/40 backdrop-blur-md border border-emerald-500/30',
              runningPhase === 'defense' ? 'scale-[1.02] z-20 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'shadow-lg'
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/20 rounded-t-xl" />
            
            <div className="flex items-center gap-2 mt-1 pb-3 border-b border-emerald-500/10">
              <Shield size={14} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 drop-shadow-sm">
                Obrona
              </span>
            </div>
            
            <div className="flex flex-col gap-3">
              {defenseTeam.models.length === 0 ? (
                <p className="text-[9px] text-white/30 italic uppercase tracking-wider text-center py-4">
                  Pusto
                </p>
              ) : (
                defenseTeam.expertRoleByModel &&
                Object.values(defenseTeam.expertRoleByModel).map((roleId, idx) =>
                  renderSeat('defense', roleId, idx)
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between items-center py-2 relative">
          
          <div
            className={cn(
              'w-full max-w-[360px] rounded-2xl px-6 py-5 relative flex flex-col items-center justify-center transition-all duration-700 z-10 bg-black/50 backdrop-blur-md border border-gold-primary/30',
              runningPhase === 'verdict' ? 'scale-[1.02] z-20 shadow-[0_0_30px_rgba(212,175,55,0.15)]' : 'shadow-xl'
            )}
          >
            <div className="absolute inset-x-3 top-3 bottom-3 border border-white/5 rounded-xl pointer-events-none shadow-inner" />
            
            <div className="bg-[#1a0f0c] border border-[#d4af37]/30 rounded px-4 py-1.5 mb-4 shadow-inner flex items-center gap-2">
              <Gavel size={12} className="text-[#d4af37]" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#d4af37]">
                Wysoki Trybunał
              </span>
            </div>

            <div className="flex flex-col items-center z-10">
              <p className="text-[8px] text-white/50 font-bold uppercase tracking-[0.2em]">
                Sędzia Przewodniczący
              </p>
              <p className="text-[11px] text-[#e6c762] font-black uppercase tracking-widest mt-1 truncate max-w-[220px] drop-shadow-md">
                {getJudgeModelName().split('/').pop()}
              </p>
            </div>

            <div className="flex items-center gap-12 mt-5 border-t border-[#4a2f23]/50 pt-4 w-full justify-center z-10">
              <div className="flex flex-col items-center group">
                <svg
                  className="w-14 h-14 text-[#d4af37] transition-transform duration-700 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <path d="M12 3v15M8 18h8M6 21h12" />
                  <g
                    style={{
                      transform: `rotate(${scaleAngle}deg)`,
                      transformOrigin: '12px 6px',
                      transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    <path d="M5 6h14" strokeWidth="1.5" />
                    <path d="M5 6l-2 6h4l-2-6" />
                    <path d="M2 12h6" />
                    <path d="M19 6l-2 6h4l-2-6" />
                    <path d="M16 12h6" />
                  </g>
                </svg>
                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40 transition-colors">
                  Waga sprawiedliwości
                </span>
              </div>

              <div className="flex flex-col items-center group">
                <motion.div
                  onClick={handleGavelClick}
                  className="cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors relative flex items-center justify-center shadow-inner"
                  animate={isGavelStriking ? {
                    rotate: [-45, 15, -5, 0],
                    y: [0, 8, -2, 0]
                  } : {}}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <Gavel size={26} className="text-[#d4af37] transform -scale-x-100 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]" />
                  {isGavelStriking && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 1 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      className="absolute w-8 h-8 border-2 border-[#d4af37] rounded-full"
                    />
                  )}
                </motion.div>
                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1 group-hover:text-white/40 transition-colors">
                  Uderz (Kliknij)
                </span>
              </div>
            </div>
          </div>

          <div className="my-8 flex flex-col items-center justify-center relative w-full px-2 z-30">
            <div
              className={cn(
                'w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-500 relative bg-black/60 backdrop-blur-md border border-white/10',
                speakerSide ? 'scale-110 z-20 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'opacity-50 grayscale-[0.5]'
              )}
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#fff_2px,#fff_4px)] rounded-xl mix-blend-overlay" />
              
              {speakerSide ? (
                <div className="flex flex-col items-center justify-center z-10">
                  {speakerSide === 'defense' ? (
                    <Shield size={20} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  ) : (
                    <Scale size={20} className="text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                  )}
                </div>
              ) : (
                <BookOpen size={20} className="text-white/30 z-10" />
              )}
            </div>

            {speakerSide && (
              <div className="flex gap-1.5 items-center justify-center my-3">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-1.5 rounded-full animate-bounce shadow-lg',
                      speakerSide === 'defense' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'
                    )}
                    style={{
                      height: `${[10, 20, 28, 14, 8][i]}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
              </div>
            )}

            <AnimatePresence>
              {speechText && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={cn(
                    'w-full max-w-lg border rounded-2xl p-5 relative mt-2 text-left z-30',
                    speakerSide === 'defense'
                      ? 'border-emerald-500/30'
                      : speakerSide === 'prosecution'
                      ? 'border-rose-500/30'
                      : 'border-[#d4af37]/30'
                  )}
                  style={{
                    background: 'rgba(15, 10, 8, 0.75)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      {speakerSide === 'defense' ? (
                        <Shield size={14} className="text-emerald-400" />
                      ) : speakerSide === 'prosecution' ? (
                        <Scale size={14} className="text-rose-400" />
                      ) : (
                        <Gavel size={14} className="text-[#d4af37]" />
                      )}
                      <span
                        className={cn(
                          'text-[10px] font-black uppercase tracking-[0.2em]',
                          speakerSide === 'defense'
                            ? 'text-emerald-400'
                            : speakerSide === 'prosecution'
                            ? 'text-rose-400'
                            : 'text-[#d4af37]'
                        )}
                      >
                        {runningPhase === 'verdict'
                          ? 'Sąd wydaje wyrok'
                          : `${speakerSide === 'defense' ? 'Obrona' : 'Oskarżenie'} · ${speakerRoleName || 'Ekspert'}`}
                      </span>
                    </div>
                    {speakerModel && (
                      <span className="text-[8px] text-white/50 font-bold uppercase tracking-wider truncate max-w-[140px] bg-white/5 px-2 py-0.5 rounded">
                        {speakerModel.split('/').pop()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#e6c762] font-semibold whitespace-pre-wrap max-h-[160px] overflow-y-auto custom-scrollbar pr-2 drop-shadow-sm">
                    {speechText}
                  </p>
                  
                  <div 
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t"
                    style={{
                      background: 'rgba(15, 10, 8, 0.95)',
                      borderColor: speakerSide === 'defense' ? 'rgba(16, 185, 129, 0.3)' : speakerSide === 'prosecution' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(212, 175, 55, 0.3)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-24 h-12 rounded-lg flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
            <Scroll size={12} className="text-white/30 mb-1" />
            <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em]">
              Protokolant
            </span>
          </div>

        </div>

        <div className="flex flex-col justify-end items-center pb-4">
          <div
            className={cn(
              'w-full max-w-[170px] rounded-xl p-5 flex flex-col gap-4 relative transition-all duration-700 bg-black/40 backdrop-blur-md border border-rose-500/30',
              runningPhase === 'prosecution' ? 'scale-[1.02] z-20 shadow-[0_0_20px_rgba(225,29,72,0.2)]' : 'shadow-lg'
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/20 rounded-t-xl" />
            
            <div className="flex items-center gap-2 mt-1 pb-3 border-b border-rose-500/10 justify-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 drop-shadow-sm">
                Oskarżenie
              </span>
              <Scale size={14} className="text-rose-500" />
            </div>
            
            <div className="flex flex-col gap-3">
              {prosecutionTeam.models.length === 0 ? (
                <p className="text-[9px] text-white/30 italic uppercase tracking-wider text-center py-4">
                  Pusto
                </p>
              ) : (
                prosecutionTeam.expertRoleByModel &&
                Object.values(prosecutionTeam.expertRoleByModel).map((roleId, idx) =>
                  renderSeat('prosecution', roleId, idx)
                )
              )}
            </div>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {activeTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-10 left-10 right-10 p-5 rounded-2xl z-50 text-left border"
            style={{
              background: 'rgba(10, 6, 4, 0.9)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderColor: activeTooltip.side === 'defense' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(225, 29, 72, 0.4)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg bg-white/5 border",
                  activeTooltip.side === 'defense' ? 'border-emerald-500/30' : 'border-rose-500/30'
                )}>
                  {activeTooltip.side === 'defense' ? (
                    <Shield size={18} className="text-emerald-400" />
                  ) : (
                    <Scale size={18} className="text-rose-400" />
                  )}
                </div>
                <span className="text-[12px] font-black uppercase tracking-[0.15em] text-white drop-shadow-md">
                  {activeTooltip.roleName} <span className="text-white/40">· {activeTooltip.side === 'defense' ? 'Obrona' : 'Oskarżenie'}</span>
                </span>
              </div>
              <span className="text-[9px] text-[#d4af37] font-black uppercase tracking-[0.2em] bg-[#d4af37]/10 px-3 py-1 rounded-full border border-[#d4af37]/20">
                {activeTooltip.modelName}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/80 font-medium mb-3 max-w-3xl">
              {activeTooltip.desc}
            </p>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5 inline-block">
              <p className="text-[10px] leading-relaxed text-[#d4af37] font-bold uppercase tracking-widest">
                Wpływ na proces: <span className="text-white/90 normal-case font-medium">{activeTooltip.impact}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}
