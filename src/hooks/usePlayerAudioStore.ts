import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { getValidatedVolume } from '@/utils/validation';

type State = {
  currentAudio:
    | { element: HTMLAudioElement; shouldBePlayedAt: number }
    | undefined;
  volume: number;
};

type PlayerAudioStore = State & {
  setCurrentAudio: (audio: State['currentAudio']) => void;
  setVolume: (volume: number) => void;
};

const initialVolume = getInitialVolume();

export const usePlayerAudioStore = create(
  subscribeWithSelector<PlayerAudioStore>((set) => ({
    currentAudio: undefined,
    volume: initialVolume,
    setCurrentAudio: (audio) => {
      set({ currentAudio: audio });
    },
    setVolume: (volume) => {
      set({ volume });
      localStorage.setItem(
        '@sophia-slideshow-player:volume',
        volume.toString()
      );
    },
  }))
);

function getInitialVolume() {
  const defaultVolume = 0.1;

  const volumeFromLocalStorageAsString = localStorage.getItem(
    '@sophia-slideshow-player:volume'
  );
  const volumeFromLocalStorage = volumeFromLocalStorageAsString
    ? parseFloat(volumeFromLocalStorageAsString)
    : undefined;

  if (volumeFromLocalStorage === undefined) return defaultVolume;

  return getValidatedVolume(volumeFromLocalStorage) ?? defaultVolume;
}
