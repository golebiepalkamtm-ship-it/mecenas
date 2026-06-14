import React from 'react';
import { LIBRARY_SHELL } from '../Library/shared';
import { TrialRoomPanel } from './TrialRoomPanel';

export function TrialRoomView() {
  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4">
      <div className={`${LIBRARY_SHELL} flex flex-col`}>
        <TrialRoomPanel />
      </div>
    </div>
  );
}

export { TrialRoomPanel } from './TrialRoomPanel';
