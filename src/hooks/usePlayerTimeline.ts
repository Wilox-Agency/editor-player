import { RefObject, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import { create } from 'zustand';
import gsap from 'gsap';

export const usePlayerTimelineStore = create(() => ({
  timelineCurrentTime: 0,
  timelineDuration: 0,
  timelineState: 'paused',
}));

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

  useEffect(() => {
    timeline.eventCallback('onUpdate', () => {
      usePlayerTimelineStore.setState({ timelineCurrentTime: timeline.time() });
      layerRef.current?.draw();
    });
    timeline.eventCallback('onComplete', () => {
      usePlayerTimelineStore.setState({ timelineState: 'ended' });
    });
  }, [layerRef, timeline]);

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
