import { type RefObject, useCallback, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import gsap from 'gsap';

import { usePlayerAudioStore } from '@/hooks/usePlayerAudioStore';
import { getAllVideoElementsFromNode } from '@/utils/konva/misc';

type PlayerTimelineStore = {
  timelineCurrentTime: number;
  timelineDuration: number;
  timelineState: 'paused' | 'playing' | 'ended' | 'forcePaused';
  reset: () => void;
};

export const usePlayerTimelineStore = create(
  subscribeWithSelector<PlayerTimelineStore>((set) => ({
    timelineCurrentTime: 0,
    timelineDuration: 0,
    timelineState: 'paused',
    reset: () => {
      set({
        timelineCurrentTime: 0,
        timelineDuration: 0,
        timelineState: 'paused',
      });
    },
  }))
);

export function usePlayerTimeline({
  layerRef,
  audios,
}: {
  layerRef: RefObject<Konva.Layer>;
  audios: {
    url: string;
    shouldBePlayedAt: number;
    duration: number;
  }[];
}) {
  const timeline = useMemo(() => gsap.timeline(), []);

  function updateTimelineDuration() {
    usePlayerTimelineStore.setState({ timelineDuration: timeline.duration() });
  }

  function handlePlayOrPause() {
    const timelineEnded = timeline.time() === timeline.duration();

    // If the timeline ended, reset and play it
    if (timelineEnded) {
      timeline.time(0);
      timeline.play();

      usePlayerTimelineStore.setState({ timelineState: 'playing' });
      return;
    }

    // If the timeline is playing, pause it
    if (timeline.isActive()) {
      timeline.pause();

      usePlayerTimelineStore.setState({ timelineState: 'paused' });
      return;
    }

    // If the timeline is paused, resume it
    timeline.resume();
    usePlayerTimelineStore.setState({ timelineState: 'playing' });
  }

  function handleChangeTime(time: number) {
    timeline.pause();
    timeline.time(time);

    usePlayerTimelineStore.setState({ timelineState: 'paused' });

    // Set the audio current time (if there's a current audio)
    const { currentAudio } = usePlayerAudioStore.getState();
    if (currentAudio) {
      const { timelineCurrentTime } = usePlayerTimelineStore.getState();
      currentAudio.element.currentTime =
        timelineCurrentTime - currentAudio.shouldBePlayedAt;
    }
  }

  /**
   * Sets the current audio and plays it if the timeline is playing. Should be
   * called every time the timeline updates.
   */
  const handleCurrentAudio = useCallback(() => {
    const { timelineCurrentTime, timelineState } =
      usePlayerTimelineStore.getState();
    const { currentAudio, setCurrentAudio } = usePlayerAudioStore.getState();

    /* Check if the current audio already ended (i.e. is not the current audio
    anymore) */
    if (currentAudio) {
      /* When going back in the timeline, the current time may be moved to a
      time where the audio didn't start yet, so it also needs to be paused and
      cleared */
      const audioDidNotStart =
        timelineCurrentTime < currentAudio.shouldBePlayedAt;
      const audioEnded =
        timelineCurrentTime >
        currentAudio.shouldBePlayedAt + currentAudio.element.duration;
      if (!audioDidNotStart && !audioEnded) return;

      // Pause the audio
      currentAudio.element.pause();
      // Clear the audio that ended
      setCurrentAudio(undefined);
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
      `audio[src="${audioThatShouldBePlayed.url}"]`
    ) as HTMLAudioElement | undefined;
    const audioElement =
      audioElementFromDom || new Audio(audioThatShouldBePlayed.url);

    // Set the current audio state
    setCurrentAudio({
      element: audioElement,
      shouldBePlayedAt: audioThatShouldBePlayed.shouldBePlayedAt,
    });

    /* Reset the current time (otherwise, for example, when listening to part of
    an audio, then going back to a point in the timeline when the audio didn't
    start yet, when reaching the moment when the audio starts, it would play
    from the time it had the last time it was played instead of from the start) */
    audioElement.currentTime = 0;
    // Set the default volume
    audioElement.volume = 0.1;

    // Only play the audio if the timeline is playing
    const isTimelinePlaying = timelineState === 'playing';
    if (isTimelinePlaying) audioElement.play();
  }, [audios]);

  // Set timeline event listeners
  useEffect(() => {
    timeline.eventCallback('onUpdate', () => {
      // Update timeline time
      usePlayerTimelineStore.setState({ timelineCurrentTime: timeline.time() });

      // Redraw layer
      layerRef.current?.draw();

      // Handle audio
      handleCurrentAudio();
    });
    timeline.eventCallback('onComplete', () => {
      // Update timeline state
      usePlayerTimelineStore.setState({ timelineState: 'ended' });
    });

    return () => {
      timeline.eventCallback('onUpdate', null);
      timeline.eventCallback('onComplete', null);
    };
  }, [handleCurrentAudio, layerRef, timeline]);

  // Play/pause video and audio elements depending on timeline state
  useEffect(() => {
    /* Subscribe to state changes instead of using the state as a `useEffect`
    dependency to prevent extra re-renders, as this value is not being used to
    update the UI where this hook is used */
    const unsubscribe = usePlayerTimelineStore.subscribe(
      ({ timelineState }) => timelineState,
      (timelineState) => {
        const videoElements = getAllVideoElementsFromNode(layerRef.current!);
        const { currentAudio } = usePlayerAudioStore.getState();

        if (timelineState === 'playing') {
          videoElements.forEach((element) => element.play());
          currentAudio?.element.play();
        } else {
          videoElements.forEach((element) => element.pause());
          currentAudio?.element.pause();
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

      // Do nothing when timeline already ended or was unforcedly paused
      if (timelineState === 'ended' || timelineState === 'paused') return;

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
