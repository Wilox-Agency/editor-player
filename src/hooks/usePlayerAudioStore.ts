import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { LocalStorageKeys } from '@/utils/localStorage';
import { getInitialVolume } from '@/utils/volume';

type State = {
  currentAudio:
    | {
        element: HTMLAudioElement;
        shouldBePlayedAt: number;
        start?: number;
        duration: number;
      }
    | undefined;
  backgroundMusicElement: HTMLAudioElement | undefined;
  volume: number;
  muted: boolean;
};

type PlayerAudioStore = State & {
  setCurrentAudio: (audio: State['currentAudio']) => void;
  setBackgroundMusic: (backgroundMusicElement: HTMLAudioElement) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
};

const initialVolume = getInitialVolume();

export const usePlayerAudioStore = create(
  subscribeWithSelector<PlayerAudioStore>((set) => ({
    currentAudio: undefined,
    backgroundMusicElement: undefined,
    volume: initialVolume,
    muted: false,
    setCurrentAudio: (audio) => {
      set({ currentAudio: audio });
    },
    setBackgroundMusic: (backgroundMusicElement) => {
      set({ backgroundMusicElement });
    },
    setVolume: (volume) => {
      set({ volume, muted: false });
      localStorage.setItem(LocalStorageKeys.playerVolume, volume.toString());
    },
    toggleMute: () => {
      set((state) => ({ muted: !state.muted }));
    },
  }))
);
