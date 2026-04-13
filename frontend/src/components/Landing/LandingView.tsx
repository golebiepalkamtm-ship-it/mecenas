import LandingPage from "./v2/LandingPage";

export function LandingView({ onGoToPortal }: { onGoToPortal?: () => void }) {
  return <LandingPage onGoToPortal={onGoToPortal} />;
}
