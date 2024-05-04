import { type RefObject, useCallback, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { subscribeWithSelector } from 'zustand/middleware';
import gsap from 'gsap';

import { usePlayerAudioStore } from '@/hooks/usePlayerAudioStore';
import { usePlayerVideoStore } from '@/hooks/usePlayerVideoStore';
import { getVideoElementFromNodeId } from '@/utils/konva/misc';
import { backgroundMusicVolumeMultiplier } from '@/utils/volume';

type TimelineInternalState = 'playing' | 'paused';

type PlayerTimelineStore = {
  timelineCurrentTime: number;
  timelineDuration: number;
  timelineState: 'notStarted' | 'paused' | 'playing' | 'ended' | 'forcePaused';
  timelineInternalState: TimelineInternalState;
  isCurrentVideoLoading: boolean;
  reset: () => void;
};

export const usePlayerTimelineStore = create(
  subscribeWithSelector<PlayerTimelineStore>((set) => ({
    timelineCurrentTime: 0,
    timelineDuration: 0,
    timelineState: 'notStarted',
    timelineInternalState: 'paused',
    isCurrentVideoLoading: false,
    reset: () => {
      set({
        timelineCurrentTime: 0,
        timelineDuration: 0,
        timelineState: 'notStarted',
        timelineInternalState: 'paused',
        isCurrentVideoLoading: false,
      });
    },
  }))
);

export function usePlayerTimeline({
  layerRef,
  audios,
  backgroundMusic,
  videos,
}: {
  layerRef: RefObject<Konva.Layer>;
  audios: {
    url: string;
    shouldBePlayedAt: number;
    start?: number;
    duration: number;
  }[];
  backgroundMusic?: { url: string; duration: number };
  videos: {
    elementId: string;
    shouldBePlayedAt: number;
    shouldBePausedAt: number;
    appearsAt: number;
    disappearsAt: number;
  }[];
}) {
  const timeline = useMemo(() => gsap.timeline(), []);

  /** Function that should be called after setting up the timeline. */
  const updateTimelineDuration = useCallback(() => {
    usePlayerTimelineStore.setState({
      /* Sometimes the timeline sends the 'onComplete' event before the timeline
      is set up (because the duration is 0), which causes the timeline state to
      be changed from 'notStarted' to 'ended', so it needs to be set to
      'notStarted' here */
      timelineState: 'notStarted',
      timelineDuration: timeline.duration(),
    });
  }, [timeline]);

  const internalPlayOrPause = useCallback(
    (action: 'play' | 'pause') => {
      const { timelineInternalState, isCurrentVideoLoading } =
        usePlayerTimelineStore.getState();

      let newState: TimelineInternalState;
      if (action) {
        newState = action === 'play' ? 'playing' : 'paused';
      } else {
        /* If no action is provided, set the new state to the opposite of the
        current state */
        newState = timelineInternalState === 'playing' ? 'paused' : 'playing';
      }

      // If trying to play the timeline when a video is loading, do nothing
      if (newState === 'playing' && isCurrentVideoLoading) return;

      usePlayerTimelineStore.setState({ timelineInternalState: newState });

      if (newState === 'playing') timeline.resume();
      else timeline.pause();
    },
    [timeline]
  );

  /** Handler that plays or pauses the timeline depending on its state. */
  const handlePlayOrPause = useCallback(() => {
    const { timelineState } = usePlayerTimelineStore.getState();

    // If the timeline ended, reset and play it
    if (timelineState === 'ended') {
      usePlayerTimelineStore.setState({ timelineState: 'playing' });
      timeline.time(0);
      internalPlayOrPause('play');
      return;
    }

    // If the timeline is playing, pause it
    if (timelineState === 'playing') {
      usePlayerTimelineStore.setState({ timelineState: 'paused' });
      internalPlayOrPause('pause');
      return;
    }

    // If the timeline is paused, resume it
    usePlayerTimelineStore.setState({ timelineState: 'playing' });
    internalPlayOrPause('play');
  }, [internalPlayOrPause, timeline]);

  /** The `onChange` event handler to be used with a timeline slider. */
  const handleChangeTime = useCallback(
    (time: number, { shouldUpdateCurrentVideo = true } = {}) => {
      const timelineEnded = time === timeline.duration();
      usePlayerTimelineStore.setState({
        timelineState: timelineEnded ? 'ended' : 'paused',
      });
      internalPlayOrPause('pause');
      timeline.time(time);

      const { currentAudio, backgroundMusicElement } =
        usePlayerAudioStore.getState();
      const { currentVideo } = usePlayerVideoStore.getState();
      const { timelineCurrentTime } = usePlayerTimelineStore.getState();

      // Set the audio and background music current times
      if (currentAudio) {
        currentAudio.element.currentTime =
          (currentAudio.start ?? 0) +
          (timelineCurrentTime - currentAudio.shouldBePlayedAt);
      }
      if (backgroundMusic && backgroundMusicElement) {
        /* The background music cycles and is played during the entire
        slideshow, so instead of subtracting the duration from the timeline
        current time, as with the current audio, just get the remainder of the
        timeline current time divided by the duration, which is equivalent to
        the current time of the music in its current cycle */
        backgroundMusicElement.currentTime =
          timelineCurrentTime % backgroundMusic.duration;
      }

      // Set the current video current time (if it should be updated)
      if (currentVideo && shouldUpdateCurrentVideo) {
        const duration =
          isNaN(currentVideo.element.duration) ||
          currentVideo.element.duration === Infinity
            ? undefined
            : currentVideo.element.duration;
        currentVideo.element.currentTime =
          duration !== undefined
            ? (timelineCurrentTime - currentVideo.shouldBePlayedAt) % duration
            : timelineCurrentTime - currentVideo.shouldBePlayedAt;

        redrawLayerAfterUpdatingVideoCurrentTime({
          videoElement: currentVideo.element,
          layer: layerRef.current,
        });
      }
    },
    [backgroundMusic, internalPlayOrPause, layerRef, timeline]
  );

  /**
   * Sets the current audio and plays it if the timeline is playing. Should be
   * called every time the timeline updates.
   */
  const handleCurrentAudio = useCallback(() => {
    const { timelineCurrentTime, timelineInternalState } =
      usePlayerTimelineStore.getState();
    const { currentAudio, setCurrentAudio, volume } =
      usePlayerAudioStore.getState();

    // If there's a current audio, check if it should still be the current audio
    if (currentAudio) {
      /* When going back in the timeline, the current time may be moved to a
      time where the audio didn't start yet, so it also needs to be paused and
      cleared */
      const audioStarted = timelineCurrentTime >= currentAudio.shouldBePlayedAt;
      const audioEnded =
        timelineCurrentTime >
        currentAudio.shouldBePlayedAt + currentAudio.duration;
      // If the audio should still be playing, do nothing
      if (audioStarted && !audioEnded) return;

      // Clear the audio that ended
      setCurrentAudio(undefined);
      // Pause the audio
      currentAudio.element.pause();
    }

    // Check if there's an audio that should be played
    const audioThatShouldBePlayed = audios.find((audio) => {
      const isPastTimeItShouldStart =
        timelineCurrentTime >= audio.shouldBePlayedAt;
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
    const isTimelinePlaying = timelineInternalState === 'playing';
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
    const { timelineCurrentTime, timelineInternalState } =
      usePlayerTimelineStore.getState();
    const isTimelinePlaying = timelineInternalState === 'playing';

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

  /**
   * Sets the current video and plays it if the timeline is playing. Should be
   * called every time the timeline updates.
   */
  const handleCurrentVideo = useCallback(() => {
    const { timelineCurrentTime, timelineInternalState } =
      usePlayerTimelineStore.getState();
    const { currentVideo, setCurrentVideo } = usePlayerVideoStore.getState();

    /* Reset the current time of all videos that are not visible (only the ones
    that are not visible because updating the current time of a video causes it
    to flicker, so it's better to do it only when the video is not visible; this
    condition also ends up including the currently playing video, which should
    also not be reset) */
    videos.forEach((video) => {
      const isVisible =
        timelineCurrentTime >= video.appearsAt &&
        timelineCurrentTime < video.disappearsAt;
      if (isVisible) return;

      const videoElement = getVideoElementFromNodeId(
        video.elementId,
        layerRef.current!
      );
      if (videoElement.currentTime === 0) return;

      videoElement.currentTime = 0;
    });

    // TODO: If we end up supporting multiple videos at once, handle them here
    // If there's a current video, check if it should still be the current video
    if (currentVideo) {
      /* When going back in the timeline, the current time may be moved to a
      time where the video didn't start yet, so it also needs to be paused and
      cleared */
      const videoStarted = timelineCurrentTime >= currentVideo.shouldBePlayedAt;
      const videoEnded = timelineCurrentTime > currentVideo.shouldBePausedAt;
      // If the video should still be playing, do nothing
      if (videoStarted && !videoEnded) return;

      // Clear the current video that ended
      setCurrentVideo(undefined);
      // Pause the video
      currentVideo.element.pause();
    }

    // Check if there's a video that should be played
    const videoThatShouldBePlayed = videos.find((video) => {
      const isPastTimeItShouldStart =
        timelineCurrentTime >= video.shouldBePlayedAt;
      const isBeforeTimeItShouldEnd =
        timelineCurrentTime < video.shouldBePausedAt;
      return isPastTimeItShouldStart && isBeforeTimeItShouldEnd;
    });

    // If there's no video that should be played, do nothing
    if (!videoThatShouldBePlayed) return;

    const videoElement = getVideoElementFromNodeId(
      videoThatShouldBePlayed.elementId,
      layerRef.current!
    );

    setCurrentVideo({
      element: videoElement,
      shouldBePlayedAt: videoThatShouldBePlayed.shouldBePlayedAt,
      shouldBePausedAt: videoThatShouldBePlayed.shouldBePausedAt,
    });

    // Only play the video if the timeline is playing
    const isTimelinePlaying = timelineInternalState === 'playing';
    if (isTimelinePlaying) videoElement.play();
  }, [layerRef, videos]);

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
      // Handle video
      handleCurrentVideo();
    });
    timeline.eventCallback('onComplete', () => {
      // Update timeline state
      usePlayerTimelineStore.setState({ timelineState: 'ended' });
    });

    return () => {
      timeline.eventCallback('onUpdate', null);
      timeline.eventCallback('onComplete', null);
    };
  }, [
    handleBackgroundMusic,
    handleCurrentAudio,
    handleCurrentVideo,
    layerRef,
    timeline,
  ]);

  /* Play/pause video and audio elements depending on the timeline internal
  state */
  useEffect(() => {
    /* Subscribe to state changes instead of using the state as a `useEffect`
    dependency to prevent extra re-renders, as this value is not being used to
    update the UI where this hook is used */
    const unsubscribe = usePlayerTimelineStore.subscribe(
      ({ timelineInternalState }) => timelineInternalState,
      (timelineInternalState) => {
        const { currentAudio, backgroundMusicElement } =
          usePlayerAudioStore.getState();
        const { currentVideo } = usePlayerVideoStore.getState();

        if (timelineInternalState === 'playing') {
          currentAudio?.element.play();
          backgroundMusicElement?.play();
          currentVideo?.element.play();
        } else {
          currentAudio?.element.pause();
          backgroundMusicElement?.pause();
          currentVideo?.element.pause();
        }
      }
    );
    return () => unsubscribe();
  }, [layerRef]);

  // Set event listeners to update the `isCurrentVideoLoading` state
  useEffect(() => {
    const unsubscribe = usePlayerVideoStore.subscribe(
      ({ currentVideo }) => currentVideo,
      (currentVideo) => {
        const isCurrentVideoLoading = currentVideo
          ? !didVideoBufferEnough(currentVideo.element)
          : false;
        // Set the initial state of `isCurrentVideoLoading`
        usePlayerTimelineStore.setState({ isCurrentVideoLoading });

        const interval = setInterval(() => {
          if (!currentVideo) return;

          const videoElement = currentVideo.element;
          const hasEnoughData = didVideoBufferEnough(videoElement);

          usePlayerTimelineStore.setState({
            isCurrentVideoLoading: !hasEnoughData,
          });
          /* The interval should be a little shorter than the amount of seconds
          buffered that is considered enough to play, so that it can properly
          pause the timeline when the video did not buffer enough. In this case,
          the interval is half the time. */
        }, (SECONDS_TO_BUFFER * 1000) / 2);

        return () => clearInterval(interval);
      }
    );

    return () => unsubscribe();
  }, []);

  /* Pause the timeline when a video starts loading and resume it when it can be
  a video that was loading can now be played */
  useEffect(() => {
    const unsubscribe = usePlayerTimelineStore.subscribe(
      ({ isCurrentVideoLoading }) => isCurrentVideoLoading,
      (isCurrentVideoLoading) => {
        /* This listener should not be executed because of `timelineState`
        changes, so instead of including it in the selector, get its current
        value when the listener is called */
        const { timelineState } = usePlayerTimelineStore.getState();
        // Do nothing if the timeline is not playing
        if (timelineState !== 'playing') return;

        if (isCurrentVideoLoading) {
          /* FIXME: Even though the timeline is being paused, which in turn
          pauses the video, sometimes the video still keeps playing */
          // When a video starts loading, pause the timeline
          internalPlayOrPause('pause');
        } else {
          /* When a video that was loading can now be played, resume the
          timeline */
          internalPlayOrPause('play');
        }
      }
    );

    return () => unsubscribe();
  }, [internalPlayOrPause, timeline]);

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
        internalPlayOrPause('pause');
        usePlayerTimelineStore.setState({ timelineState: 'forcePaused' });
        return;
      }

      /* Unpause when tab gets active (if it was force paused by the tab getting
      inactive) */
      if (timelineState === 'forcePaused') {
        internalPlayOrPause('play');
        usePlayerTimelineStore.setState({ timelineState: 'playing' });
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [internalPlayOrPause, timeline]);

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
      ({ currentAudio, backgroundMusicElement }) => {
        function handlePlayAudio() {
          // FIXME: Pause the audio again if the timeline cannot be played
          const { timelineState } = usePlayerTimelineStore.getState();
          if (timelineState !== 'playing') handlePlayOrPause();
        }

        function handlePauseAudio() {
          if (!currentAudio) return;

          const { timelineState, timelineCurrentTime } =
            usePlayerTimelineStore.getState();

          const audioEnded =
            timelineCurrentTime >
            currentAudio.shouldBePlayedAt + currentAudio.duration;
          /* Only pause the timeline if the timeline is playing AND the audio
          didn't pause just because it ended */
          if (timelineState === 'playing' && audioEnded) {
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
      },
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
    updateTimelineDuration,
    handlePlayOrPause,
    handleChangeTime,
  };
}

function redrawLayerAfterUpdatingVideoCurrentTime({
  videoElement,
  layer,
}: {
  videoElement: HTMLVideoElement;
  layer: Konva.Layer | null;
}) {
  /* TODO: Maybe, instead of setting a max wait time to prevent a lot of loops
  from existing at the same time, only let one recursive `requestAnimationFrame`
  loop to exist at a time, so that the loop can be running for as long as it
  needs to */
  let didStopForLoading = false;
  const startTime = new Date().getTime();
  const maxWaitTime = 1000; // 1s

  /* After updating the video current time, the video element may not have
  enough data to be able to draw the current video frame, but its readyState
  will be greater or equal to HAVE_CURRENT_DATA for a while before it actually
  starts loading, so wait for it to start loading then wait for the current
  frame data to be available before redrawing the layer */
  function redrawLayerAfterVideoHasEnoughData() {
    const currentTime = new Date().getTime();
    const timeElapsed = currentTime - startTime;
    if (timeElapsed >= maxWaitTime) return;

    if (videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
      didStopForLoading = true;
      requestAnimationFrame(redrawLayerAfterVideoHasEnoughData);
      return;
    }

    if (!didStopForLoading) {
      requestAnimationFrame(redrawLayerAfterVideoHasEnoughData);
      return;
    }

    layer?.draw();
  }
  redrawLayerAfterVideoHasEnoughData();
}

function getBufferedTimeRanges(videoElement: HTMLVideoElement) {
  const timeRangesBufferedObject = videoElement.buffered;
  const timeRangesBuffered: [start: number, end: number][] = [];
  //Go through the object and output an array
  for (let count = 0; count < timeRangesBufferedObject.length; count++) {
    timeRangesBuffered.push([
      timeRangesBufferedObject.start(count),
      timeRangesBufferedObject.end(count),
    ]);
  }
  return timeRangesBuffered;
}

/**
 * The amount of seconds that the video should have buffered to be considered
 * enough to play. This is an arbitrary value, but it should not be too small or
 * too big.
 *
 * If it's too small — the video will play with just a bit of buffer, which
 * might cause some glitches and will cause the video to pause too often.
 *
 * If it's too big — the video might never play as it will never be able to
 * buffer enough data.
 */
const SECONDS_TO_BUFFER = 1;

function didVideoBufferEnough(videoElement: HTMLVideoElement) {
  const timeRangesBuffered = getBufferedTimeRanges(videoElement);

  const currentTime = videoElement.currentTime;

  for (const timeRange of timeRangesBuffered) {
    const [start, end] = timeRange;
    const needsToBeBufferedUntil = Math.min(
      currentTime + SECONDS_TO_BUFFER,
      videoElement.duration
    );
    const didBufferEnough =
      currentTime >= start && needsToBeBufferedUntil <= end;
    if (didBufferEnough) {
      /* Also check if the `readyState` of the video is `HAVE_ENOUGH_DATA`, as
      if the video is played in a lower `readyState`, it may lag and get
      desynced with the timeline */
      return videoElement.readyState === videoElement.HAVE_ENOUGH_DATA;
    }
  }
  return false;
}
