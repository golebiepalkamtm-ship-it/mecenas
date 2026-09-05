import { LIBRARY_SHELL } from '../Library/shared';
import { TrialRoomPanel } from './TrialRoomPanel';

export function TrialRoomView() {
  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden">
      <TrialRoomPanel />
    </div>
  );
}

export { TrialRoomPanel } from './TrialRoomPanel';
