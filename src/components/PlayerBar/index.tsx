import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { create } from 'zustand';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Popover from '@radix-ui/react-popover';
import {
  useFocusVisible,
  useFocusWithin,
  useHover,
} from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';

import styles from './PlayerBar.module.css';

import { usePlayerTimelineStore } from '@/hooks/usePlayerTimeline';
import { usePlayerAudioStore } from '@/hooks/usePlayerAudioStore';
import { backgroundMusicVolumeMultiplier } from '@/utils/volume';
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

  const playerBarRef = useRef<HTMLDivElement>(null);
  const { visibility, playerBarProps } = usePlayerBarVisibility({
    playerBarRef,
    isTimelinePlaying: timelineState === 'playing',
  });

  /* Update the volume of the current audio and background music when the volume
  state changes */
  useEffect(() => {
    const { currentAudio, backgroundMusicElement } =
      usePlayerAudioStore.getState();

    if (currentAudio) currentAudio.element.volume = volume;
    if (backgroundMusicElement) {
      backgroundMusicElement.volume = volume * backgroundMusicVolumeMultiplier;
    }
  }, [volume]);

  return (
    <Toolbar.Root
      className={styles.playerBar}
      style={{
        display: visibility === 'hidden' ? 'none' : undefined,
        opacity: visibility === 'visible' ? 1 : 0,
      }}
      {...playerBarProps}
      ref={playerBarRef}
    >
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

function useIsMouseMoving() {
  const [isMouseMoving, setIsMouseMoving] = useState(false);

  const mouseIdleTimeoutRef = useRef<number>();

  useEffect(() => {
    function handleMouseMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;

      clearTimeout(mouseIdleTimeoutRef.current);
      setIsMouseMoving(true);
      mouseIdleTimeoutRef.current = setTimeout(() => {
        setIsMouseMoving(false);
      }, 100);
    }

    window.addEventListener('pointermove', handleMouseMove);
    return () => window.removeEventListener('pointermove', handleMouseMove);
  }, []);

  return { isMouseMoving };
}

function useFocusVisibleWithin() {
  const { isFocusVisible } = useFocusVisible();
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const { focusWithinProps } = useFocusWithin({
    onFocusWithinChange: setIsFocusWithin,
  });

  const isFocusVisibleWithin = useMemo(
    () => isFocusVisible && isFocusWithin,
    [isFocusVisible, isFocusWithin]
  );

  return { isFocusVisibleWithin, focusVisibleWithinProps: focusWithinProps };
}

const hideDelayInSeconds = 3;
const hideAnimationDurationInSeconds = 0.15;

type Visibility = 'visible' | 'hiding' | 'hidden';
type PlayerVisibilityStore = {
  visibility: Visibility;
  setVisibility: (visibility: Visibility) => void;
};

/* Using a store to be able to get the state using a snapshot instead of using a
"reactive" variable */
const usePlayerVisibilityStore = create<PlayerVisibilityStore>((set) => ({
  visibility: 'visible',
  setVisibility: (visibility) => {
    set({ visibility });
  },
}));

// TODO: Instantly hide the player bar if the mouse moves out of the window
function usePlayerBarVisibility({
  playerBarRef,
  isTimelinePlaying,
}: {
  playerBarRef: RefObject<HTMLElement>;
  isTimelinePlaying: boolean;
}) {
  const { visibility, setVisibility } = usePlayerVisibilityStore();
  const hidingTimeoutRef = useRef<number>();
  const hideTimeoutRef = useRef<number>();

  const { isHovered, hoverProps } = useHover({});
  const { isFocusVisibleWithin, focusVisibleWithinProps } =
    useFocusVisibleWithin();
  const { isMouseMoving } = useIsMouseMoving();

  const hidePlayerBar = useCallback(
    ({ withTimeout = false }: { withTimeout?: boolean } = {}) => {
      /* Using state inside a function redefines it on every render, and
      redefining the function re-runs any effect that has it as a dependency,
      which in this case is undesired, so a snapshot of the state is being used
      instead of a "reactive" variable */
      const { visibility, setVisibility } = usePlayerVisibilityStore.getState();
      // If the player bar is already hidden (or is hiding), do nothing
      if (visibility !== 'visible') return;

      function hide() {
        // Start hiding
        setVisibility('hiding');

        // Set as hidden when the hide animation finished
        hideTimeoutRef.current = setTimeout(() => {
          setVisibility('hidden');
        }, hideAnimationDurationInSeconds * 1000);
      }

      if (!withTimeout) {
        hide();
        return;
      }

      hidingTimeoutRef.current = setTimeout(hide, hideDelayInSeconds * 1000);
    },
    []
  );

  // Toggle player bar visibility when touching outside of it,
  useEffect(() => {
    // TODO: Do nothing if volume slider is open
    function handleTouchOutside(event: TouchEvent) {
      const isPlayerBarTouch = playerBarRef.current?.contains(
        event.target as HTMLElement | null
      );
      if (isPlayerBarTouch) return;

      clearTimeout(hidingTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);

      if (visibility !== 'visible') {
        setVisibility('visible');

        // If the timeline is still playing, hide the player bar after a timeout
        if (isTimelinePlaying) {
          hidePlayerBar({ withTimeout: true });
        }
        return;
      }

      hidePlayerBar();
    }

    window.addEventListener('touchstart', handleTouchOutside);
    return () => window.removeEventListener('touchstart', handleTouchOutside);
  }, [
    hidePlayerBar,
    isTimelinePlaying,
    playerBarRef,
    setVisibility,
    visibility,
  ]);

  // Toggle player bar visibility depending on various states
  useEffect(() => {
    // TODO: Also require the volume slider to be closed to set the hide timeout
    const shouldSetHideTimeout =
      isTimelinePlaying &&
      !isHovered &&
      !isFocusVisibleWithin &&
      !isMouseMoving;
    if (!shouldSetHideTimeout) {
      clearTimeout(hidingTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
      setVisibility('visible');
      return;
    }

    hidePlayerBar({ withTimeout: true });
  }, [
    hidePlayerBar,
    isFocusVisibleWithin,
    isHovered,
    isMouseMoving,
    isTimelinePlaying,
    setVisibility,
  ]);

  // Hide cursor when player bar is hidden (or is hiding)
  useEffect(() => {
    if (visibility !== 'visible') {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.removeProperty('cursor');
    }
  }, [visibility]);

  return {
    visibility,
    playerBarProps: mergeProps(hoverProps, focusVisibleWithinProps),
  };
}
