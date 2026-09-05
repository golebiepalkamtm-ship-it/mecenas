import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Shield, Scale, ChevronRight, Loader2, RotateCcw, Settings, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTrialRoomStore } from '../../store/useTrialRoomStore';
import { useFavoriteModelsState } from '../../hooks/chatSettingsSelectors';
import { useTrialStream } from '../../hooks/useTrialStream';
import { usePromptPresets } from '../../hooks/usePromptPresets';
import { useSelectableChatModels } from '../../hooks/useSelectableChatModels';
import { ELABORATION_PRESETS } from '../../utils/chatContextForTrial';
import type { Model } from '../Chat/types';
import { TRIAL_STEPS, type TrialSide } from './types';
import {
  DEFENSE_EXPERT_ROLE_IDS,
  PROSECUTION_EXPERT_ROLE_IDS,
} from '../../utils/modelSelection';
import { TrialChatContextStep } from './TrialChatContextStep';
import { TrialSideTeamPanel } from './TrialSideTeamPanel';
import { TrialBriefCards } from './TrialBriefCards';
import { TrialHearingStenograph } from './TrialHearingStenograph';
import { TrialCourtroomVisual } from './TrialCourtroomVisual';
import { buildTrialProtocolMarkdown, downloadTrialMarkdown } from './exportTrialProtocol';
import trialBg from '../../assets/sala_rozpraw_bg.jpg';

const SIDE_BTN = {
  defense: 'border-emerald-500/40 bg-emerald-50/80 text-emerald-900',
  prosecution: 'border-rose-500/40 bg-rose-50/80 text-rose-900',
} as const;

export function TrialRoomPanel() {
  const {
    step,
    question,
    chatContext,
    sourceSessionId,
    elaborationMode,
    defenseBrief,
    prosecutionBrief,
    hearingRounds,
    verdict,
    progressMessage,
    runningPhase,
    defenseTeam,
    prosecutionTeam,
    verdictJudgeModel,
    setStep,
    setQuestion,
    setElaborationMode,
    setDefenseBrief,
    setProsecutionBrief,
    setHearingRounds,
    addHearingRound,
    setVerdict,
    setProgressMessage,
    setRunningPhase,
    patchDefenseTeam,
    patchProsecutionTeam,
    setVerdictJudgeModel,
    resetCase,
  } = useTrialRoomStore();

  const { presets } = usePromptPresets();
  const { favoriteModels } = useFavoriteModelsState();
  const { models: pool } = useSelectableChatModels('all', favoriteModels, '', 'all');
  const { runPosition, runHearing, runVerdict } = useTrialStream();

  const [draftDefense, setDraftDefense] = useState('');
  const [draftProsecution, setDraftProsecution] = useState('');
  const [draftVerdict, setDraftVerdict] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const elaboration = ELABORATION_PRESETS[elaborationMode];
  const canProceedCase =
    chatContext.trim().length > 20 || question.trim().length >= 10;
  const canHearing =
    defenseBrief.trim().length >= 20 && prosecutionBrief.trim().length >= 20;
  const stepIndex =
    step === 'done' ? TRIAL_STEPS.length : TRIAL_STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    if (defenseTeam.models.length > 0 && !verdictJudgeModel) {
      setVerdictJudgeModel(defenseTeam.judgeModel || defenseTeam.models[0]);
    }
  }, [defenseTeam.judgeModel, defenseTeam.models, verdictJudgeModel, setVerdictJudgeModel]);

  useEffect(() => {
    const ids = pool.map((m: Model) => m.id).slice(0, 7);
    if (!ids.length) return;
    const defMap: Record<string, string> = {};
    DEFENSE_EXPERT_ROLE_IDS.forEach((role, i) => {
      if (ids[i]) defMap[ids[i]] = role;
    });
    const proMap: Record<string, string> = {};
    PROSECUTION_EXPERT_ROLE_IDS.forEach((role, i) => {
      if (ids[i]) proMap[ids[i]] = role;
    });
    if (defenseTeam.models.length === 0) {
      patchDefenseTeam({ models: ids, expertRoleByModel: defMap, judgeModel: ids[0] });
    }
    if (prosecutionTeam.models.length === 0) {
      patchProsecutionTeam({ models: ids, expertRoleByModel: proMap, judgeModel: ids[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length]);

  const teamReady = (side: TrialSide) => {
    const team = side === 'defense' ? defenseTeam : prosecutionTeam;
    const roleIds =
      side === 'defense' ? DEFENSE_EXPERT_ROLE_IDS : PROSECUTION_EXPERT_ROLE_IDS;
    return roleIds.every((rid) =>
      Object.entries(team.expertRoleByModel).some(([, r]) => r === rid),
    );
  };

  const apiBase = () => ({
    question: question.trim(),
    chat_context: chatContext.trim(),
    elaboration_mode: elaborationMode,
  });

  const extractContextPoints = async () => {
    if (!chatContext.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setErrorMsg(null);
    setQuestion('');
    setProgressMessage('Ekstrakcja kluczowych informacji...');
    
    try {
      const full = await runExtract(
        {
          question: question.trim(),
          chat_context: chatContext.trim(),
          model: pool[0]?.id || 'google/gemini-2.5-flash-lite',
        },
        {
          signal: abortRef.current.signal,
          onMeta: setProgressMessage,
          onChunk: (t) => {
            setQuestion((q) => q + t);
          },
        }
      );
      setQuestion(full || question);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErrorMsg(e instanceof Error ? e.message : 'Błąd ekstrakcji');
      }
    } finally {
      setProgressMessage('');
    }
  };

  const runSidePosition = async (side: TrialSide) => {
    if (!canProceedCase) return;
    if (!teamReady(side)) {
      setErrorMsg(`Przypisz model do każdej roli (${side === 'defense' ? 'obrona' : 'oskarżenie'}).`);
      return;
    }
    const bundle = presets?.[side];
    const team = side === 'defense' ? defenseTeam : prosecutionTeam;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setErrorMsg(null);
    setRunningPhase(side);
    setProgressMessage('');
    if (side === 'defense') {
      setDraftDefense('');
      setDefenseBrief('');
    } else {
      setDraftProsecution('');
      setProsecutionBrief('');
    }

    try {
      const full = await runPosition(
        side,
        {
          ...apiBase(),
          selected_models: team.models,
          aggregator_model: team.judgeModel || team.models[0],
          architect_prompt: bundle?.architectPrompt,
          expert_roles: team.expertRoleByModel,
          role_catalog: bundle?.unitSystemRoles,
          chat_mode: team.models.length > 1 ? 'moa' : 'single',
        },
        {
          signal: abortRef.current.signal,
          onMeta: setProgressMessage,
          onChunk: (t) => {
            if (side === 'defense') setDraftDefense((d) => d + t);
            else setDraftProsecution((d) => d + t);
          },
        },
      );
      if (side === 'defense') {
        setDefenseBrief(full);
        setStep('prosecution');
      } else {
        setProsecutionBrief(full);
        setStep('hearing');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErrorMsg(e instanceof Error ? e.message : 'Błąd generowania pozycji');
      }
    } finally {
      setRunningPhase(null);
      setProgressMessage('');
    }
  };

  const runHearingPhase = async () => {
    if (!canHearing) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setRunningPhase('hearing');
    setHearingRounds([]);
    setErrorMsg(null);

    const prosModel =
      prosecutionTeam.models[0] || pool[0]?.id || 'google/gemini-2.5-flash-lite';
    const defModel = defenseTeam.models[0] || pool[1]?.id || prosModel;

    try {
      await runHearing(
        {
          ...apiBase(),
          defense_brief: defenseBrief,
          prosecution_brief: prosecutionBrief,
          rounds: elaboration.hearingRounds,
          prosecution_model: prosModel,
          defense_model: defModel,
        },
        {
          signal: abortRef.current.signal,
          onMeta: setProgressMessage,
          onRound: (r) => addHearingRound(r),
          onChunk: () => {},
        },
      );
      setStep('verdict');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErrorMsg(e instanceof Error ? e.message : 'Błąd symulacji sali');
      }
    } finally {
      setRunningPhase(null);
      setProgressMessage('');
    }
  };

  const runVerdictPhase = async () => {
    if (!canHearing) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setRunningPhase('verdict');
    setDraftVerdict('');
    setErrorMsg(null);
    const judge =
      verdictJudgeModel ||
      defenseTeam.judgeModel ||
      prosecutionTeam.judgeModel ||
      pool[0]?.id ||
      'google/gemini-2.5-flash-lite';

    const protocol =
      hearingRounds.length > 0
        ? hearingRounds
            .map(
              (r) =>
                `### Tura ${r.round} — ${r.side === 'prosecution' ? 'OSKARŻENIE' : 'OBRONA'}\n${r.text}`,
            )
            .join('\n\n')
        : '';

    try {
      const full = await runVerdict(
        {
          ...apiBase(),
          defense_brief: defenseBrief,
          prosecution_brief: prosecutionBrief,
          hearing_protocol: protocol,
          judge_model: judge,
        },
        {
          signal: abortRef.current.signal,
          onMeta: setProgressMessage,
          onChunk: (t) => setDraftVerdict((d) => d + t),
        },
      );
      setVerdict(full);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErrorMsg(e instanceof Error ? e.message : 'Błąd werdyktu');
      }
    } finally {
      setRunningPhase(null);
      setProgressMessage('');
    }
  };

  const handleExport = () => {
    const md = buildTrialProtocolMarkdown({
      question,
      chatContext,
      defenseBrief,
      prosecutionBrief,
      hearingRounds,
      verdict: verdict || draftVerdict,
    });
    downloadTrialMarkdown(md);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    resetCase();
    setDraftDefense('');
    setDraftProsecution('');
    setDraftVerdict('');
    setErrorMsg(null);
    void useTrialRoomStore.persist.clearStorage();
  };

  const defenseDisplay = runningPhase === 'defense' ? draftDefense : defenseBrief;
  const prosecutionDisplay = runningPhase === 'prosecution' ? draftProsecution : prosecutionBrief;
  const showDefensePanel =
    step === 'defense' || step === 'prosecution' || step === 'hearing' || step === 'verdict' || step === 'done';
  const showProsecutionPanel =
    step === 'prosecution' || step === 'hearing' || step === 'verdict' || step === 'done';

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative bg-black">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 brightness-150 contrast-125 saturate-110" 
        style={{ 
          backgroundImage: `url(${trialBg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} 
      />

      {/* Content */}
      <div className="relative z-10 flex h-full">

        {/* Floating Sidebar Toggle Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-6 left-6 z-50 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/80 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            title="Otwórz panel konfiguracji symulacji"
          >
            <Settings size={20} />
          </button>
        )}

        {/* SIDEBAR - Configuration */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[380px] shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-white/10 bg-black/70 backdrop-blur-3xl p-5 flex flex-col gap-6 shadow-[10px_0_30px_rgba(0,0,0,0.5)] absolute md:relative z-40"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  Konfiguracja Sali
                </h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {errorMsg && (
            <p className="text-[10px] font-bold text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 backdrop-blur-sm shadow-md">
              {errorMsg}
            </p>
          )}

          {step === 'case' && (
            <TrialChatContextStep
              chatContext={chatContext}
              question={question}
              elaborationMode={elaborationMode}
              onElaborationChange={setElaborationMode}
              onQuestionChange={setQuestion}
              onContinue={() => setStep('defense')}
              fromChat={!!sourceSessionId}
              onExtractPoints={extractContextPoints}
              isExtracting={progressMessage === 'Ekstrakcja kluczowych informacji...'}
            />
          )}

          {showDefensePanel && (
            <TrialSideTeamPanel
              side="defense"
              roleIds={DEFENSE_EXPERT_ROLE_IDS}
              team={defenseTeam}
              pool={pool}
              disabled={runningPhase !== null}
              onPatch={patchDefenseTeam}
            />
          )}

          {showProsecutionPanel && (
            <TrialSideTeamPanel
              side="prosecution"
              roleIds={PROSECUTION_EXPERT_ROLE_IDS}
              team={prosecutionTeam}
              pool={pool}
              disabled={runningPhase !== null}
              onPatch={patchProsecutionTeam}
            />
          )}

          {step !== 'case' && (
            <div className="flex flex-col gap-3">
              {(step === 'defense' || defenseBrief.length === 0) && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={!canProceedCase || runningPhase !== null || !teamReady('defense')}
                    onClick={() => void runSidePosition('defense')}
                    onMouseEnter={() => setHoveredAction('gen-defense')}
                    onMouseLeave={() => setHoveredAction(null)}
                    className="w-full px-6 py-3 rounded-xl bg-black/60 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-black/80 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  >
                    {runningPhase === 'defense' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Shield size={16} />
                    )}
                    Wygeneruj pozycję obrony
                  </button>
                  <AnimatePresence>
                    {hoveredAction === 'gen-defense' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-black/90 border border-white/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-left z-[9999] pointer-events-none"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                          Pozycja Obrony
                        </p>
                        <p className="text-[8px] leading-relaxed text-white/60 font-bold uppercase tracking-wider">
                          Uruchamia zespół obrońców w celu przeanalizowania dowodów i przygotowania optymalnej strategii obrony.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {(step === 'prosecution' || (defenseBrief && !prosecutionBrief)) &&
                defenseBrief.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={
                        !canProceedCase || runningPhase !== null || !teamReady('prosecution')
                      }
                      onClick={() => void runSidePosition('prosecution')}
                      onMouseEnter={() => setHoveredAction('gen-prosecution')}
                      onMouseLeave={() => setHoveredAction(null)}
                      className="w-full px-6 py-3 rounded-xl bg-black/60 border border-rose-500/30 text-rose-400 hover:text-rose-300 hover:bg-black/80 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 backdrop-blur-md shadow-[0_0_15px_rgba(225,29,72,0.1)]"
                    >
                      {runningPhase === 'prosecution' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Scale size={16} />
                      )}
                      Wygeneruj pozycję oskarżenia
                    </button>
                    <AnimatePresence>
                      {hoveredAction === 'gen-prosecution' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-black/90 border border-white/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-left z-[9999] pointer-events-none"
                        >
                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">
                            Pozycja Oskarżenia
                          </p>
                          <p className="text-[8px] leading-relaxed text-white/60 font-bold uppercase tracking-wider">
                            Uruchamia zespół oskarżycieli w celu wykrycia luk w prawie i obalenia argumentacji obrony.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
            </div>
          )}

          {canHearing && (step === 'verdict' || step === 'done' || verdict || draftVerdict) && (
            <div className="space-y-3 p-2 mt-2 bg-black/30 border border-white/5 rounded-2xl p-4 shadow-inner">
              <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/80 block drop-shadow-md">
                Sędzia werdyktu (neutralny)
              </label>
              <select
                value={verdictJudgeModel}
                onChange={(e) => setVerdictJudgeModel(e.target.value)}
                disabled={runningPhase !== null}
                className="w-full text-[11px] font-bold rounded-lg border border-white/10 bg-black/60 text-white/90 px-3 py-2 outline-none focus:border-gold-primary/50"
                aria-label="Model sędziego werdyktu"
              >
                {pool.map((m: Model) => (
                  <option key={m.id} value={m.id} className="bg-[#111] text-white">
                    {m.name || m.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-auto pt-4">
            <p className="text-center text-[9px] text-white/40 font-black uppercase tracking-[0.3em] drop-shadow-md">
              Pula modeli · {pool.length} · tryb {elaboration.label}
            </p>
          </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN AREA - Courtroom Visuals */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 relative">
          {step !== 'case' && (
            <TrialCourtroomVisual
              defenseTeam={defenseTeam}
              prosecutionTeam={prosecutionTeam}
              verdictJudgeModel={verdictJudgeModel}
              runningPhase={runningPhase}
              hearingRounds={hearingRounds}
              verdict={verdict}
              progressMessage={progressMessage}
              pool={pool}
            />
          )}

          {step !== 'case' && (
            <TrialBriefCards defenseText={defenseDisplay} prosecutionText={prosecutionDisplay} />
          )}

          <AnimatePresence>
            {canHearing &&
              (step === 'hearing' ||
                step === 'verdict' ||
                step === 'done' ||
                hearingRounds.length > 0) && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <TrialHearingStenograph
                    rounds={hearingRounds}
                    running={runningPhase === 'hearing'}
                    roundsCount={elaboration.hearingRounds}
                    onRoundsCountChange={() => {}}
                    onStart={() => void runHearingPhase()}
                    canStart={canHearing && runningPhase === null}
                    roundsLocked
                  />
                </motion.div>
              )}
          </AnimatePresence>

          {canHearing && (step === 'verdict' || step === 'done' || verdict || draftVerdict) && (
             <div className="mt-6">
                <TrialVerdictPanel
                  verdict={verdict}
                  draft={draftVerdict}
                  running={runningPhase === 'verdict'}
                  canRequest={canHearing && !verdict}
                  onRequest={() => void runVerdictPhase()}
                  onExport={handleExport}
                />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
