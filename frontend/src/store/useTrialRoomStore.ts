import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TrialSide } from '../components/TrialRoom/types';
import type { ChatMessage } from '../types/chat';
import {
  deriveTrialQuestionFromChat,
  formatChatMessagesForTrial,
  type TrialElaborationMode,
} from '../utils/chatContextForTrial';
import { createSafeStorage } from '../utils/safeStorage';
import { capString } from '../utils/storageLimits';

export type TrialStep = 'case' | 'defense' | 'prosecution' | 'hearing' | 'verdict' | 'done';

export interface TrialSideTeam {
  models: string[];
  expertRoleByModel: Record<string, string>;
  judgeModel: string;
}

export interface HearingRound {
  round: number;
  side: TrialSide;
  text: string;
  model?: string;
}

const MAX_BRIEF = 24_000;
const MAX_VERDICT = 16_000;
const MAX_CONTEXT = 48_000;

interface TrialRoomState {
  step: TrialStep;
  question: string;
  chatContext: string;
  sourceSessionId: string;
  elaborationMode: TrialElaborationMode;
  defenseTeam: TrialSideTeam;
  prosecutionTeam: TrialSideTeam;
  verdictJudgeModel: string;
  defenseBrief: string;
  prosecutionBrief: string;
  hearingRounds: HearingRound[];
  verdict: string;
  progressMessage: string;
  runningPhase: TrialSide | 'hearing' | 'verdict' | null;
  setStep: (step: TrialStep) => void;
  setQuestion: (q: string) => void;
  setChatContext: (ctx: string) => void;
  setElaborationMode: (mode: TrialElaborationMode) => void;
  importFromChat: (messages: ChatMessage[], sessionId: string) => void;
  setDefenseBrief: (t: string) => void;
  setProsecutionBrief: (t: string) => void;
  setHearingRounds: (rounds: HearingRound[]) => void;
  addHearingRound: (round: HearingRound) => void;
  setVerdict: (t: string) => void;
  setProgressMessage: (msg: string) => void;
  setRunningPhase: (p: TrialRoomState['runningPhase']) => void;
  patchDefenseTeam: (p: Partial<TrialSideTeam>) => void;
  patchProsecutionTeam: (p: Partial<TrialSideTeam>) => void;
  setVerdictJudgeModel: (modelId: string) => void;
  resetCase: () => void;
}

const emptyTeam = (): TrialSideTeam => ({
  models: [],
  expertRoleByModel: {},
  judgeModel: '',
});

const initialState = {
  step: 'case' as TrialStep,
  question: '',
  chatContext: '',
  sourceSessionId: '',
  elaborationMode: 'standard' as TrialElaborationMode,
  defenseTeam: emptyTeam(),
  prosecutionTeam: emptyTeam(),
  verdictJudgeModel: '',
  defenseBrief: '',
  prosecutionBrief: '',
  hearingRounds: [] as HearingRound[],
  verdict: '',
  progressMessage: '',
  runningPhase: null as TrialRoomState['runningPhase'],
};

export const useTrialRoomStore = create<TrialRoomState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setQuestion: (question) => set({ question }),
      setChatContext: (chatContext) =>
        set({ chatContext: capString(chatContext, MAX_CONTEXT) }),
      setElaborationMode: (elaborationMode) => set({ elaborationMode }),
      importFromChat: (messages, sessionId) => {
        const ctx = formatChatMessagesForTrial(messages);
        set({
          chatContext: ctx,
          sourceSessionId: sessionId,
          question: deriveTrialQuestionFromChat(messages),
          step: 'case',
          defenseBrief: '',
          prosecutionBrief: '',
          hearingRounds: [],
          verdict: '',
          runningPhase: null,
        });
      },
      setDefenseBrief: (defenseBrief) =>
        set({ defenseBrief: capString(defenseBrief, MAX_BRIEF) }),
      setProsecutionBrief: (prosecutionBrief) =>
        set({ prosecutionBrief: capString(prosecutionBrief, MAX_BRIEF) }),
      setHearingRounds: (hearingRounds) => set({ hearingRounds }),
      addHearingRound: (round) =>
        set((s) => ({ hearingRounds: [...s.hearingRounds, round] })),
      setVerdict: (verdict) =>
        set({ verdict: capString(verdict, MAX_VERDICT), step: 'done' }),
      setProgressMessage: (progressMessage) => set({ progressMessage }),
      setRunningPhase: (runningPhase) => set({ runningPhase }),
      patchDefenseTeam: (p) =>
        set((s) => ({ defenseTeam: { ...s.defenseTeam, ...p } })),
      patchProsecutionTeam: (p) =>
        set((s) => ({ prosecutionTeam: { ...s.prosecutionTeam, ...p } })),
      setVerdictJudgeModel: (verdictJudgeModel) => set({ verdictJudgeModel }),
      resetCase: () =>
        set({
          ...initialState,
          defenseTeam: emptyTeam(),
          prosecutionTeam: emptyTeam(),
        }),
    }),
    {
      name: 'lexmind-trial-room-v1',
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: (state) => ({
        step: state.step,
        question: state.question,
        chatContext: state.chatContext,
        sourceSessionId: state.sourceSessionId,
        elaborationMode: state.elaborationMode,
        defenseTeam: state.defenseTeam,
        prosecutionTeam: state.prosecutionTeam,
        verdictJudgeModel: state.verdictJudgeModel,
        defenseBrief: state.defenseBrief,
        prosecutionBrief: state.prosecutionBrief,
        hearingRounds: state.hearingRounds,
        verdict: state.verdict,
      }),
    },
  ),
);
