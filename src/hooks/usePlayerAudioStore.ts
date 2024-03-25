import { create } from 'zustand';

type State = {
  currentAudio:
    | { element: HTMLAudioElement; shouldBePlayedAt: number }
    | undefined;
};

type PlayerAudioStore = State & {
  setCurrentAudio: (audio: State['currentAudio']) => void;
};

export const usePlayerAudioStore = create<PlayerAudioStore>((set) => ({
  currentAudio: undefined,
  setCurrentAudio: (audio) => {
    set({ currentAudio: audio });
  },
}));
