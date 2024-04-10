import { type RefObject, useCallback, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { subscribeWithSelector } from 'zustand/middleware';
import gsap from 'gsap';

import { usePlayerAudioStore } from '@/hooks/usePlayerAudioStore';
import { getAllVideoElementsFromNode } from '@/utils/konva/misc';
import { backgroundMusicVolumeMultiplier } from '@/utils/volume';
import { cleanListener } from '@/utils/zustand';

type PlayerTimelineStore = {
  timelineCurrentTime: number;
  timelineDuration: number;
  timelineState: 'notStarted' | 'paused' | 'playing' | 'ended' | 'forcePaused';
  reset: () => void;
};

export const usePlayerTimelineStore = create(
  subscribeWithSelector<PlayerTimelineStore>((set) => ({
    timelineCurrentTime: 0,
    timelineDuration: 0,
    timelineState: 'notStarted',
    reset: () => {
      set({
        timelineCurrentTime: 0,
        timelineDuration: 0,
        timelineState: 'notStarted',
      });
    },
  }))
);

export function usePlayerTimeline({
  layerRef,
  audios,
  backgroundMusic,
}: {
  layerRef: RefObject<Konva.Layer>;
  audios: {
    url: string;
    shouldBePlayedAt: number;
    start?: number;
    duration: number;
  }[];
  backgroundMusic?: { url: string; duration: number };
}) {
  const timeline = useMemo(() => gsap.timeline(), []);

  function updateTimelineDuration() {
    usePlayerTimelineStore.setState({ timelineDuration: timeline.duration() });
  }

  const handlePlayOrPause = useCallback(() => {
    const timelineEnded = timeline.time() === timeline.duration();

    // If the timeline ended, reset and play it
    if (timelineEnded) {
      usePlayerTimelineStore.setState({ timelineState: 'playing' });
      timeline.time(0);
      timeline.play();
      return;
    }

    // If the timeline is playing, pause it
    if (timeline.isActive()) {
      usePlayerTimelineStore.setState({ timelineState: 'paused' });
      timeline.pause();
      return;
    }

    // If the timeline is paused, resume it
    usePlayerTimelineStore.setState({ timelineState: 'playing' });
    timeline.resume();
  }, [timeline]);

  function handleChangeTime(time: number) {
    usePlayerTimelineStore.setState({ timelineState: 'paused' });
    timeline.pause();
    timeline.time(time);

    const { currentAudio, backgroundMusicElement } =
      usePlayerAudioStore.getState();
    const { timelineCurrentTime } = usePlayerTimelineStore.getState();

    // Set the audio and background music current times
    if (currentAudio) {
      currentAudio.element.currentTime =
        (currentAudio.start ?? 0) +
        (timelineCurrentTime - currentAudio.shouldBePlayedAt);
    }
    if (backgroundMusic && backgroundMusicElement) {
      /* The background music cycles and is played during the entire slideshow,
      so instead of subtracting the duration from the timeline current time, as
      with the current audio, just get the remainder of the timeline current
      time divided by the duration, which is equivalent to the current time of
      the music in its current cycle */
      backgroundMusicElement.currentTime =
        timelineCurrentTime % backgroundMusic.duration;
    }
  }

  /**
   * Sets the current audio and plays it if the timeline is playing. Should be
   * called every time the timeline updates.
   */
  const handleCurrentAudio = useCallback(() => {
    const { timelineCurrentTime, timelineState } =
      usePlayerTimelineStore.getState();
    const { currentAudio, setCurrentAudio, volume } =
      usePlayerAudioStore.getState();

    /* Check if the current audio already ended (i.e. is not the current audio
    anymore) */
    if (currentAudio) {
      /* When going back in the timeline, the current time may be moved to a
      time where the audio didn't start yet, so it also needs to be paused and
      cleared */
      const audioStarted = timelineCurrentTime >= currentAudio.shouldBePlayedAt;
      const audioEnded =
        timelineCurrentTime >
        currentAudio.shouldBePlayedAt + currentAudio.duration;
      if (audioStarted && !audioEnded) return;

      // Clear the audio that ended
      setCurrentAudio(undefined);
      // Pause the audio
      currentAudio.element.pause();
    }

    // Check if there's an audio that should be played
    const audioThatShouldBePlayed = audios.find((audio) => {
      const isPastTimeItShouldStart =
        timelineCurrentTime > audio.shouldBePlayedAt;
      const isBeforeTimeItShouldEnd =
        timelineCurrentTime < audio.shouldBePlayedAt + audio.duration;
      return isPastTimeItShouldStart && isBeforeTimeItShouldEnd;
    });

    if (!audioThatShouldBePlayed) return;

    const audioElementFromDom = document.querySelector(
      `audio[data-src="${audioThatShouldBePlayed.url}"]`
    ) as HTMLAudioElement | undefined;
    let audioElement;
    if (audioElementFromDom) {
      audioElement = audioElementFromDom;
    } else {
      audioElement = new Audio(audioThatShouldBePlayed.url);
      audioElement.preload = 'auto';
      audioElement.setAttribute('data-src', audioThatShouldBePlayed.url);
      document.body.append(audioElement);
    }

    // Set the current audio state
    setCurrentAudio({
      element: audioElement,
      shouldBePlayedAt: audioThatShouldBePlayed.shouldBePlayedAt,
      start: audioThatShouldBePlayed.start,
      duration: audioThatShouldBePlayed.duration,
    });

    /* Reset the current time (otherwise, for example, when listening to part of
    an audio, then going back to a point in the timeline when the audio didn't
    start yet, when reaching the moment when the audio starts, it would play
    from the time it had the last time it was played instead of from the start) */
    audioElement.currentTime = audioThatShouldBePlayed.start ?? 0;
    // Set the current volume
    audioElement.volume = volume;

    // Only play the audio if the timeline is playing
    const isTimelinePlaying = timelineState === 'playing';
    if (isTimelinePlaying) audioElement.play();
  }, [audios]);

  /**
   * Sets the background music and plays it if the timeline is playing. Should
   * be called every time the timeline updates.
   */
  const handleBackgroundMusic = useCallback(() => {
    if (!backgroundMusic) return;

    const { backgroundMusicElement, setBackgroundMusic, volume } =
      usePlayerAudioStore.getState();
    const { timelineCurrentTime, timelineState } =
      usePlayerTimelineStore.getState();
    const isTimelinePlaying = timelineState === 'playing';

    if (!backgroundMusicElement) {
      const audioElementFromDom = document.querySelector(
        `audio[data-src="${backgroundMusic.url}"]`
      ) as HTMLAudioElement | undefined;
      let audioElement;
      if (audioElementFromDom) {
        audioElement = audioElementFromDom;
      } else {
        audioElement = new Audio(backgroundMusic.url);
        audioElement.preload = 'auto';
        audioElement.setAttribute('data-src', backgroundMusic.url);
        document.body.append(audioElement);
      }

      // Set the background music state
      setBackgroundMusic(audioElement);

      // Set the current volume
      audioElement.volume = volume * backgroundMusicVolumeMultiplier;
      // Only play the background music if the timeline is playing
      if (isTimelinePlaying) audioElement.play();

      return;
    }

    // Cycle the background music if it ended
    if (backgroundMusicElement.ended) {
      backgroundMusicElement.currentTime =
        timelineCurrentTime % backgroundMusic.duration;

      if (isTimelinePlaying) backgroundMusicElement.play();
    }
  }, [backgroundMusic]);

  // Set timeline event listeners
  useEffect(() => {
    timeline.eventCallback('onUpdate', () => {
      // Update timeline time
      usePlayerTimelineStore.setState({ timelineCurrentTime: timeline.time() });

      // Redraw layer
      layerRef.current?.draw();

      // Handle audio and background music
      handleCurrentAudio();
      handleBackgroundMusic();
    });
    timeline.eventCallback('onComplete', () => {
      // Update timeline state
      usePlayerTimelineStore.setState({ timelineState: 'ended' });
    });

    return () => {
      timeline.eventCallback('onUpdate', null);
      timeline.eventCallback('onComplete', null);
    };
  }, [handleBackgroundMusic, handleCurrentAudio, layerRef, timeline]);

  // Play/pause video and audio elements depending on timeline state
  useEffect(() => {
    /* Subscribe to state changes instead of using the state as a `useEffect`
    dependency to prevent extra re-renders, as this value is not being used to
    update the UI where this hook is used */
    const unsubscribe = usePlayerTimelineStore.subscribe(
      ({ timelineState }) => timelineState,
      (timelineState) => {
        const videoElements = getAllVideoElementsFromNode(layerRef.current!);
        const { currentAudio, backgroundMusicElement } =
          usePlayerAudioStore.getState();

        if (timelineState === 'playing') {
          videoElements.forEach((element) => {
            element.autoplay = true;
            element.play();
          });
          currentAudio?.element.play();
          backgroundMusicElement?.play();
        } else {
          videoElements.forEach((element) => {
            element.autoplay = false;
            element.pause();
          });
          currentAudio?.element.pause();
          backgroundMusicElement?.pause();
        }
      }
    );
    return () => unsubscribe();
  }, [layerRef]);

  /* Resume/pause the timeline based on the document's visibility state (i.e. if
  the browser tab is active or not) */
  useEffect(() => {
    function handleVisibilityChange() {
      const { timelineState } = usePlayerTimelineStore.getState();

      // Do nothing when timeline is idle
      const isTimelineIdle =
        timelineState === 'notStarted' ||
        timelineState === 'ended' ||
        timelineState === 'paused';
      if (isTimelineIdle) return;

      // Force pause when tab gets inactive
      if (document.hidden) {
        /* The timeline already stops playing when tab gets inactive, but it's
        being paused to:
        1. guarantee that it actually stopped on all browsers;
        2. make so the timeline 'active' and 'paused' states have appropriate
           values, as the timeline is still considered to be active and unpaused
           when the tab is inactive. */
        timeline.pause();
        usePlayerTimelineStore.setState({ timelineState: 'forcePaused' });
        return;
      }

      if (timelineState === 'forcePaused') {
        timeline.resume();
        usePlayerTimelineStore.setState({ timelineState: 'playing' });
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeline]);

  /* Play/pause the timeline when the audio or background music is played/paused
  using a shortcut, gesture or something similar (which can be identified by the
  audio being played/paused but the timeline not; using the Media Session API
  was already considered, but it's not supported in WebView Android, which is
  one of the target's of this application) */
  useEffect(() => {
    /* Subscribe to state changes instead of using the state as a `useEffect`
    dependency to prevent extra re-renders, as this value is not being used to
    update the UI where this hook is used */
    const unsubscribe = usePlayerAudioStore.subscribe(
      ({ currentAudio, backgroundMusicElement }) => ({
        currentAudio,
        backgroundMusicElement,
      }),
      cleanListener(({ currentAudio, backgroundMusicElement }) => {
        function handlePlayAudio() {
          const { timelineState } = usePlayerTimelineStore.getState();
          if (timelineState !== 'playing') handlePlayOrPause();
        }

        function handlePauseAudio(event: Event) {
          const { timelineState } = usePlayerTimelineStore.getState();
          const element = event.target as HTMLMediaElement;
          /* Only pause the timeline if the timeline is playing AND the audio
          didn't pause just because it ended */
          if (timelineState === 'playing' && !element.ended) {
            handlePlayOrPause();
          }
        }

        currentAudio?.element.addEventListener('play', handlePlayAudio);
        currentAudio?.element.addEventListener('pause', handlePauseAudio);
        backgroundMusicElement?.addEventListener('play', handlePlayAudio);
        backgroundMusicElement?.addEventListener('pause', handlePauseAudio);

        return () => {
          currentAudio?.element.removeEventListener('play', handlePlayAudio);
          currentAudio?.element.removeEventListener('pause', handlePauseAudio);
          backgroundMusicElement?.removeEventListener('play', handlePlayAudio);
          backgroundMusicElement?.removeEventListener(
            'pause',
            handlePauseAudio
          );
        };
      }),
      { equalityFn: shallow }
    );
    return () => unsubscribe();
  }, [handlePlayOrPause]);

  // Clear timeline when the component that uses this hook is destroyed
  useEffect(() => {
    return () => {
      timeline.clear();
    };
  }, [timeline]);

  return {
    timeline,
    /** Function that should be called after setting up the timeline. */
    updateTimelineDuration,
    /** Handler that plays or pauses the timeline depending on its state. */
    handlePlayOrPause,
    /** The `onChange` event handler to be used with a timeline slider. */
    handleChangeTime,
  };
}
