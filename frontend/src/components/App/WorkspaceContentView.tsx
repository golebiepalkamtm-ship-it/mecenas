import { lazy, Suspense } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import type { Tab } from '../../types/navigation';

const ChatView = lazy(() => import('../Chat').then((m) => ({ default: m.ChatView })));
const KnowledgeView = lazy(() => import('../Knowledge').then((m) => ({ default: m.KnowledgeView })));
const JudgmentsView = lazy(() => import('../Judgments').then((m) => ({ default: m.JudgmentsView })));
const PromptsView = lazy(() => import('../Prompts').then((m) => ({ default: m.PromptsView })));
const SettingsView = lazy(() => import('../Settings').then((m) => ({ default: m.SettingsView })));
const AdminView = lazy(() => import('../Admin').then((m) => ({ default: m.AdminView })));
const DrafterView = lazy(() => import('../Drafter').then((m) => ({ default: m.DrafterView })));
const DocumentsView = lazy(() => import('../Documents').then((m) => ({ default: m.DocumentsView })));
const TrialRoomView = lazy(() => import('../TrialRoom').then((m) => ({ default: m.TrialRoomView })));

interface WorkspaceContentViewProps {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
}

function renderContentView(activeTab: Tab, onNavigate: (tab: Tab) => void) {
  switch (activeTab) {
    case 'chat':
      return <ChatView onNavigate={onNavigate} />;
    case 'trial':
      return <TrialRoomView />;
    case 'knowledge':
      return <KnowledgeView />;
    case 'prompts':
      return <PromptsView />;
    case 'judgments':
      return <JudgmentsView />;
    case 'drafter':
      return <DrafterView />;
    case 'documents':
      return <DocumentsView />;
    case 'settings':
      return <SettingsView />;
    case 'admin':
      return <AdminView />;
    default:
      return <ChatView onNavigate={onNavigate} />;
  }
}

export function WorkspaceContentView({ activeTab, onNavigate }: WorkspaceContentViewProps) {
  try {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full"
        >
          <Suspense
            fallback={
              <div className="flex-grow w-full h-full flex flex-col justify-center items-center gap-4 bg-transparent">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  {/* Outer pulse */}
                  <motion.div
                    animate={{
                      scale: [1, 1.8, 1],
                      opacity: [0.15, 0, 0.15],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full bg-gold-primary/30 filter blur-sm"
                  />
                  {/* Middle pulse */}
                  <motion.div
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.35, 0.08, 0.35],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3,
                    }}
                    className="absolute w-10 h-10 rounded-full bg-gold-primary/20 border border-gold-primary/45"
                  />
                  {/* Inner glowing dot */}
                  <motion.div
                    animate={{
                      scale: [0.9, 1.1, 0.9],
                      boxShadow: [
                        "0 0 10px rgba(212,175,55,0.6)",
                        "0 0 24px rgba(212,175,55,0.9)",
                        "0 0 10px rgba(212,175,55,0.6)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-4 h-4 rounded-full bg-gold-bright shadow-lg z-10"
                  />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gold-primary/60 animate-pulse font-outfit">
                  Synchronizacja węzła...
                </span>
              </div>
            }
          >
            {renderContentView(activeTab, onNavigate)}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  } catch (error) {
    console.error('[WorkspaceContentView] Error rendering tab:', activeTab, error);
    return (
      <div className="flex-grow flex items-center justify-center text-red-500">
        Blad ladowania zakladki: {activeTab}
      </div>
    );
  }
}
