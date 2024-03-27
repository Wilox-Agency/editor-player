import { useEffect } from 'react';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Popover from '@radix-ui/react-popover';
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';

import styles from './PlayerBar.module.css';

import { usePlayerTimelineStore } from '@/hooks/usePlayerTimeline';
import { usePlayerAudioStore } from '@/hooks/usePlayerAudioStore';
import { Volumes } from '@/utils/validation';

import { Slider } from '@/components/Slider';

export function PlayerBar({
  handlePlayOrPause,
  handleChangeTime,
}: {
  handlePlayOrPause: () => void;
  handleChangeTime: (time: number) => void;
}) {
  const { timelineCurrentTime, timelineDuration, timelineState } =
    usePlayerTimelineStore();
  const volume = usePlayerAudioStore((state) => state.volume);
  const setVolume = usePlayerAudioStore((state) => state.setVolume);

  // Use a different volume icon depending on the volume
  const VolumeIcon = volume === 0 ? VolumeX : volume <= 0.5 ? Volume1 : Volume2;

  useEffect(() => {
    const { currentAudio } = usePlayerAudioStore.getState();
    if (!currentAudio) return;

    currentAudio.element.volume = volume;
  }, [volume]);

  return (
    <Toolbar.Root className={styles.playerBar}>
      <Toolbar.Button
        className={styles.playerBarButton}
        onClick={handlePlayOrPause}
      >
        {timelineState === 'playing' ? (
          <Pause size={18} aria-label="Pause" />
        ) : (
          <Play size={18} aria-label="Play" />
        )}
      </Toolbar.Button>

      <Popover.Root>
        <Toolbar.Button asChild>
          <Popover.Trigger className={styles.playerBarButton}>
            <VolumeIcon size={18} aria-label="Volume" />
          </Popover.Trigger>
        </Toolbar.Button>

        <Popover.Portal>
          <Popover.Content
            className={styles.popover}
            side="top"
            sideOffset={12}
          >
            <Slider
              aria-label="Volume slider"
              value={volume}
              minValue={Volumes.minVolume}
              maxValue={Volumes.maxVolume}
              step={Volumes.volumeStep}
              bottomMargin="none"
              orientation="vertical"
              onChange={setVolume}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span className={styles.playerBarTime}>
        <span>{formatTime(timelineCurrentTime)}</span> /{' '}
        <span>{formatTime(timelineDuration)}</span>
      </span>

      <Slider
        aria-label="Timeline"
        value={timelineCurrentTime}
        minValue={0}
        maxValue={timelineDuration}
        step={0.001}
        length="full-flex"
        bottomMargin="none"
        onChange={handleChangeTime}
      />
    </Toolbar.Root>
  );
}

function formatTime(timeInSeconds: number) {
  const minutes = Math.floor(timeInSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(timeInSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}
