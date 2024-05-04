import { create } from 'zustand';

import { subscribeWithSelectorAndCleanup } from '@/utils/zustand';

type State = {
  currentVideo:
    | {
        element: HTMLVideoElement;
        shouldBePlayedAt: number;
        shouldBePausedAt: number;
      }
    | undefined;
};

type PlayerVideoStore = State & {
  setCurrentVideo: (video: State['currentVideo']) => void;
};

export const usePlayerVideoStore = create(
  subscribeWithSelectorAndCleanup<PlayerVideoStore>((set) => ({
    currentVideo: undefined,
    setCurrentVideo: (video) => {
      set({ currentVideo: video });
    },
  }))
);
