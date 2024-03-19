import { RefObject, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import gsap from 'gsap';

import { getAllVideoElementsFromNode } from '@/utils/konva/misc';

type PlayerTimelineStore = {
  timelineCurrentTime: number;
  timelineDuration: number;
  timelineState: 'paused' | 'playing' | 'ended';
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
}: {
  layerRef: RefObject<Konva.Layer>;
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
  }

  // Set timeline event listeners
  useEffect(() => {
    timeline.eventCallback('onUpdate', () => {
      // Update timeline time
      usePlayerTimelineStore.setState({ timelineCurrentTime: timeline.time() });
      // Redraw layer
      layerRef.current?.draw();
    });
    timeline.eventCallback('onComplete', () => {
      // Update timeline state
      usePlayerTimelineStore.setState({ timelineState: 'ended' });
    });
  }, [layerRef, timeline]);

  // Play/pause video elements depending on timeline state
  useEffect(() => {
    /* Subscribe to state changes instead of using the state as a `useEffect`
    dependency to prevent extra re-renders, as this value is not being used to
    update the UI where this hook is used */
    const unsubscribe = usePlayerTimelineStore.subscribe(
      ({ timelineState }) => timelineState,
      (timelineState) => {
        const videoElements = getAllVideoElementsFromNode(layerRef.current!);

        if (timelineState === 'playing') {
          videoElements.forEach((element) => element.play());
        } else {
          videoElements.forEach((element) => element.pause());
        }
      }
    );
    return () => unsubscribe();
  }, [layerRef]);

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
