import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { create } from 'zustand';
import { offset, useFloating } from '@floating-ui/react-dom';
import {
  useFocusVisible,
  useFocusWithin,
  useHover,
} from '@react-aria/interactions';
import { useFocusRing } from '@react-aria/focus';
import { mergeProps } from '@react-aria/utils';
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';

import styles from './PlayerBar.module.css';

import { usePlayerTimelineStore } from '@/hooks/usePlayerTimeline';
import { usePlayerAudioStore } from '@/hooks/usePlayerAudioStore';
import { backgroundMusicVolumeMultiplier } from '@/utils/volume';
import { Volumes } from '@/utils/validation';

import { Slider } from '@/components/Slider';

export function PlayerBar({
  disabled,
  handlePlayOrPause,
  handleChangeTime,
}: {
  disabled?: boolean;
  handlePlayOrPause: () => void;
  handleChangeTime: (time: number) => void;
}) {
  const { timelineCurrentTime, timelineDuration, timelineState } =
    usePlayerTimelineStore();

  const playerBarRef = useRef<HTMLDivElement>(null);
  const { visibility, playerBarProps } = usePlayerBarVisibility({
    playerBarRef,
    isTimelinePlaying: timelineState === 'playing',
  });

  return (
    <div
      className={styles.playerBar}
      style={{
        display: visibility === 'hidden' ? 'none' : undefined,
        opacity: visibility === 'visible' ? 1 : 0,
      }}
      {...playerBarProps}
      ref={playerBarRef}
    >
      <button
        className={styles.playerBarButton}
        disabled={disabled}
        onClick={handlePlayOrPause}
      >
        {timelineState === 'playing' ? (
          <Pause size={18} aria-label="Pause" />
        ) : (
          <Play size={18} aria-label="Play" />
        )}
      </button>

      <VolumeButton disabled={disabled} />

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
        isDisabled={disabled}
        onChange={handleChangeTime}
      />
    </div>
  );
}

function VolumeButton({ disabled }: { disabled?: boolean }) {
  const volume = usePlayerAudioStore((state) => state.volume);
  const setVolume = usePlayerAudioStore((state) => state.setVolume);
  const muted = usePlayerAudioStore((state) => state.muted);
  const toggleMute = usePlayerAudioStore((state) => state.toggleMute);
  // Use a different volume icon depending on the volume and muted states
  const VolumeIcon =
    volume === 0 || muted ? VolumeX : volume <= 0.5 ? Volume1 : Volume2;

  const { isPopoverOpen, triggerProps, popoverProps } = useVolumePopover({
    disabled,
  });

  const { refs, floatingStyles } = useFloating({
    open: isPopoverOpen,
    placement: 'top',
    middleware: [offset(12)],
  });

  /* Update the volume of the current audio and background music when the volume
  or muted states changes */
  useEffect(() => {
    const { currentAudio, backgroundMusicElement } =
      usePlayerAudioStore.getState();
    const volumeToSet = muted ? 0 : volume;

    if (currentAudio) currentAudio.element.volume = volumeToSet;
    if (backgroundMusicElement) {
      backgroundMusicElement.volume =
        volumeToSet * backgroundMusicVolumeMultiplier;
    }
  }, [muted, volume]);

  return (
    <>
      <button
        className={styles.playerBarButton}
        disabled={disabled}
        onClick={toggleMute}
        {...triggerProps}
        ref={refs.setReference}
      >
        <VolumeIcon
          size={18}
          aria-label={muted ? 'Unmute volume' : 'Mute volume'}
        />
      </button>

      {isPopoverOpen && (
        <div
          style={floatingStyles}
          className={styles.popover}
          {...popoverProps}
          ref={refs.setFloating}
        >
          <Slider
            aria-label="Volume"
            value={muted ? 0 : volume}
            minValue={Volumes.minVolume}
            maxValue={Volumes.maxVolume}
            step={Volumes.volumeStep}
            bottomMargin="none"
            orientation="vertical"
            onChange={setVolume}
          />
        </div>
      )}
    </>
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

  // Toggle player bar visibility when touching outside of it
  useEffect(() => {
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
    // TODO: Test if memoizing the props is beneficial
    playerBarProps: mergeProps(hoverProps, focusVisibleWithinProps),
  };
}

function useVolumePopover({ disabled }: { disabled?: boolean }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { isHovered: isTriggerHovered, hoverProps: triggerHoverProps } =
    useHover({});
  const { isHovered: isPopoverHovered, hoverProps: popoverHoverProps } =
    useHover({});
  const {
    isFocusVisible: isTriggerFocusVisible,
    focusProps: triggerFocusProps,
  } = useFocusRing();
  const {
    isFocusVisibleWithin: isPopoverFocusVisibleWithin,
    focusVisibleWithinProps: popoverFocusVisibleWithinProps,
  } = useFocusVisibleWithin();

  /* Open instantly when one of the parts gets hovered or gets focus and close
  with delay when all parts lose focus and none of them are hovered */
  const timeoutRef = useRef<number>();
  useEffect(() => {
    if (disabled) {
      setIsPopoverOpen(false);
      return;
    }

    const shouldClosePopover =
      !isTriggerHovered &&
      !isPopoverHovered &&
      !isTriggerFocusVisible &&
      !isPopoverFocusVisibleWithin;
    if (shouldClosePopover) {
      timeoutRef.current = setTimeout(() => setIsPopoverOpen(false), 300);
      return;
    }

    clearTimeout(timeoutRef.current);
    setIsPopoverOpen(true);
  }, [
    disabled,
    isTriggerFocusVisible,
    isTriggerHovered,
    isPopoverFocusVisibleWithin,
    isPopoverHovered,
  ]);

  return {
    isPopoverOpen,
    // TODO: Test if memoizing the props is beneficial
    triggerProps: mergeProps(triggerHoverProps, triggerFocusProps),
    popoverProps: mergeProps(popoverHoverProps, popoverFocusVisibleWithinProps),
  };
}
