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
};

type PlayerAudioStore = State & {
  setCurrentAudio: (audio: State['currentAudio']) => void;
  setBackgroundMusic: (backgroundMusicElement: HTMLAudioElement) => void;
  setVolume: (volume: number) => void;
};

const initialVolume = getInitialVolume();

export const usePlayerAudioStore = create(
  subscribeWithSelector<PlayerAudioStore>((set) => ({
    currentAudio: undefined,
    backgroundMusicElement: undefined,
    volume: initialVolume,
    setCurrentAudio: (audio) => {
      set({ currentAudio: audio });
    },
    setBackgroundMusic: (backgroundMusicElement) => {
      set({ backgroundMusicElement });
    },
    setVolume: (volume) => {
      set({ volume });
      localStorage.setItem(LocalStorageKeys.playerVolume, volume.toString());
    },
  }))
);
