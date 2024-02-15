import { useEffect, useMemo, useState } from 'react';
import gsap from 'gsap';

export function useTimeline({ onUpdate }: { onUpdate: () => void }) {
  const timeline = useMemo(() => gsap.timeline(), []);
  const [timelineCurrentTime, setTimelineCurrentTime] = useState(0);
  const [timelineEndTime, setTimelineEndTime] = useState(0);
  const [timelineState, setTimelineState] = useState<
    'playing' | 'paused' | 'ended'
  >('paused');

  function handlePlayOrPause() {
    const timelineEnded = timeline.time() === timeline.duration();

    // If the timeline ended, reset and play it
    if (timelineEnded) {
      timeline.time(0);
      timeline.play();

      setTimelineState('playing');
      return;
    }

    // If the timeline is playing, pause it
    if (timeline.isActive()) {
      timeline.pause();

      setTimelineState('paused');
      return;
    }

    // If the timeline is paused, resume it
    timeline.resume();
    setTimelineState('playing');
  }

  function handleChangeTime(time: number) {
    timeline.pause();
    timeline.time(time);

    setTimelineState('paused');
  }

  useEffect(() => {
    timeline.eventCallback('onUpdate', () => {
      setTimelineCurrentTime(timeline.time());
      onUpdate();
    });
    timeline.eventCallback('onComplete', () => {
      setTimelineState('ended');
    });
  }, [onUpdate, timeline]);

  return {
    timeline,
    timelineCurrentTime,
    timelineEndTime,
    timelineState,
    /**
     * Function that should be called with the timeline duration after setting
     * up the timeline.
     */
    setTimelineEndTime,
    /** Handler that plays or pauses the timeline depending on its state. */
    handlePlayOrPause,
    /** The `onChange` event handler to be used with a timeline slider. */
    handleChangeTime,
  };
}
