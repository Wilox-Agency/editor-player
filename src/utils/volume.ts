import { LocalStorageKeys } from '@/utils/localStorage';
import { getValidatedVolume } from '@/utils/validation';

export const backgroundMusicVolumeMultiplier = 0.2;

export function getInitialVolume() {
  const defaultVolume = 0.1;

  const volumeFromLocalStorageAsString = localStorage.getItem(
    LocalStorageKeys.playerVolume
  );
  const volumeFromLocalStorage = volumeFromLocalStorageAsString
    ? parseFloat(volumeFromLocalStorageAsString)
    : undefined;

  if (volumeFromLocalStorage === undefined) return defaultVolume;

  return getValidatedVolume(volumeFromLocalStorage) ?? defaultVolume;
}
