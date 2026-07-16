import type { ReactNode } from 'react';

import type { AppPhase } from '../../types/app';

interface AppPhaseRouterProps {
  appPhase: AppPhase;
  splash: ReactNode;
  landing: ReactNode;
  portal: ReactNode;
  waitAuth: ReactNode;
}

export function AppPhaseRouter({
  appPhase,
  splash,
  landing,
  portal,
  waitAuth,
}: AppPhaseRouterProps) {
  switch (appPhase) {
    case 'splash':
      return <>{splash}</>;
    case 'landing':
      return <>{landing}</>;
    case 'portal':
      return <>{portal}</>;
    case 'wait-auth':
      return <>{waitAuth}</>;
    default:
      return null;
  }
}
