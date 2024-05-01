import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

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
  subscribeWithSelector<PlayerVideoStore>((set) => ({
    currentVideo: undefined,
    setCurrentVideo: (video) => {
      set({ currentVideo: video });
    },
  }))
);
