import LandingPage from "./v2/LandingPage";

export function LandingView({ onGoToPortal, onStartTrial }: { onGoToPortal?: () => void, onStartTrial?: () => void }) {
  return <LandingPage onGoToPortal={onGoToPortal} onStartTrial={onStartTrial} />;
}
