import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Shield, Scale, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
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
import { TrialVerdictPanel } from './TrialVerdictPanel';
import { TrialCourtroomVisual } from './TrialCourtroomVisual';
import { buildTrialProtocolMarkdown, downloadTrialMarkdown } from './exportTrialProtocol';

function stepUnlocked(
  target: (typeof TRIAL_STEPS)[number]['id'],
  step: string,
  defenseBrief: string,
  prosecutionBrief: string,
): boolean {
  const order = TRIAL_STEPS.map((s) => s.id);
  const cur = order.indexOf(step as (typeof order)[number]);
  const tgt = order.indexOf(target);
  if (tgt <= cur) return true;
  if (target === 'defense') return true;
  if (target === 'prosecution') return defenseBrief.trim().length > 0;
  if (target === 'hearing' || target === 'verdict') {
    return defenseBrief.trim().length > 0 && prosecutionBrief.trim().length > 0;
  }
  return false;
}

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
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden scheme-light">
      <header className="shrink-0 flex items-center justify-between gap-4 px-5 py-4 border-b border-black/8 bg-linear-to-r from-amber-50/90 via-white/80 to-amber-50/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gold-primary/20 border border-gold-primary/35 flex items-center justify-center">
            <Gavel size={20} className="text-black" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-black truncate">
              Sala rozprawy
            </h1>
            <p className="text-[9px] text-black/50 font-bold uppercase tracking-widest mt-0.5">
              {sourceSessionId
                ? 'Kontekst z czatu · obie strony widzą ten sam materiał'
                : 'Użyj czatu, potem przenieś sprawę tutaj'}
            </p>
          </div>
        </div>
        {progressMessage && (
          <p className="hidden md:block text-[8px] font-bold text-black/45 uppercase tracking-widest truncate max-w-70">
            {progressMessage}
          </p>
        )}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={handleReset}
            onMouseEnter={() => setHoveredAction('reset')}
            onMouseLeave={() => setHoveredAction(null)}
            className="p-2.5 rounded-xl btn-convex-glossy text-black shrink-0 flex items-center justify-center"
            aria-label="Nowa sprawa"
          >
            <RotateCcw size={16} />
          </button>
          <AnimatePresence>
            {hoveredAction === 'reset' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute top-full right-0 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                  Nowa Sprawa
                </p>
                <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider">
                  Resetuje obecną salę rozpraw i czyści cały dotychczasowy postęp.
                </p>
                <div className="absolute bottom-full right-4 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <nav className="shrink-0 flex items-center justify-center gap-1 px-4 py-3 border-b border-black/5 bg-white/40 overflow-x-auto">
        {TRIAL_STEPS.map((s, i) => {
          const unlocked = stepUnlocked(s.id, step, defenseBrief, prosecutionBrief);
          const done = i < stepIndex || (s.id === 'verdict' && !!verdict);
          const active = s.id === step || (step === 'done' && s.id === 'verdict');
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0 relative">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setStep(s.id)}
                onMouseEnter={() => setHoveredAction(`step-${s.id}`)}
                onMouseLeave={() => setHoveredAction(null)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all',
                  unlocked && 'btn-convex-glossy',
                  active && 'border-gold-primary bg-gold-primary/15 text-black',
                  done && !active && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900',
                  !active && !done && unlocked && 'text-black/70',
                  !unlocked && 'border-black/5 text-black/25 cursor-not-allowed bg-black/5',
                )}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] bg-black/10">
                  {done && !active ? '✓' : s.short}
                </span>
                {s.label}
              </button>
              
              <AnimatePresence>
                {hoveredAction === `step-${s.id}` && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                      {s.label}
                    </p>
                    <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider">
                      {s.id === 'case' ? 'Definicja stanu faktycznego i materiału dowodowego.' :
                       s.id === 'defense' ? 'Przygotowanie linii obrony przez zespół ekspertów.' :
                       s.id === 'prosecution' ? 'Przygotowanie aktu oskarżenia przez zespół.' :
                       s.id === 'hearing' ? 'Zderzenie argumentów obu stron w formie symulowanej rozprawy.' :
                       s.id === 'verdict' ? 'Ostateczny wyrok niezależnego sędziego.' :
                       'Zakończono symulację.'}
                    </p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
              {i < TRIAL_STEPS.length - 1 && (
                <ChevronRight size={12} className="text-black/20 mx-0.5" />
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {errorMsg && (
            <p className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
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
            />
          )}

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
            <TrialBriefCards defenseText={defenseDisplay} prosecutionText={prosecutionDisplay} />
          )}

          {step !== 'case' && (
            <div className="flex flex-wrap gap-3 justify-center">
              {(step === 'defense' || defenseBrief.length === 0) && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={!canProceedCase || runningPhase !== null || !teamReady('defense')}
                    onClick={() => void runSidePosition('defense')}
                    onMouseEnter={() => setHoveredAction('gen-defense')}
                    onMouseLeave={() => setHoveredAction(null)}
                    className={cn(
                      'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 btn-convex-glossy',
                      SIDE_BTN.defense,
                    )}
                  >
                    {runningPhase === 'defense' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Shield size={14} />
                    )}
                    Wygeneruj pozycję obrony
                  </button>
                  <AnimatePresence>
                    {hoveredAction === 'gen-defense' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                          Pozycja Obrony
                        </p>
                        <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider">
                          Uruchamia zespół obrońców w celu przeanalizowania dowodów i przygotowania optymalnej strategii obrony.
                        </p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-white border-r border-b border-black/10 rotate-45" />
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
                      className={cn(
                        'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 btn-convex-glossy',
                        SIDE_BTN.prosecution,
                      )}
                    >
                      {runningPhase === 'prosecution' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Scale size={14} />
                      )}
                      Wygeneruj pozycję oskarżenia
                    </button>
                    <AnimatePresence>
                      {hoveredAction === 'gen-prosecution' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                        >
                          <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                            Pozycja Oskarżenia
                          </p>
                          <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider">
                            Uruchamia zespół oskarżycieli w celu wykrycia luk w prawie i obalenia argumentacji obrony.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-white border-r border-b border-black/10 rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
            </div>
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
            <div className="space-y-3">
              <label className="text-[8px] font-black uppercase tracking-widest text-black/45 block">
                Sędzia werdyktu (neutralny) — widzi czat + obie pozycje + salę
              </label>
              <select
                value={verdictJudgeModel}
                onChange={(e) => setVerdictJudgeModel(e.target.value)}
                disabled={runningPhase !== null}
                className="w-full max-w-md text-[10px] font-bold rounded-lg border border-black/10 bg-white px-2 py-1.5"
                aria-label="Model sędziego werdyktu"
              >
                {pool.map((m: Model) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))}
              </select>
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

          <p className="text-center text-[8px] text-black/35 font-bold uppercase tracking-widest pb-4">
            Pula modeli z profilu · {pool.length} dostępnych · tryb {elaboration.label}
          </p>
        </div>
      </div>
    </div>
  );
}
