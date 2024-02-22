import { type RefObject, useEffect, useMemo, useState } from 'react';
import Konva from 'konva';

export function useVideo(
  src: string,
  {
    layerRef,
    videoRef,
  }: { layerRef: RefObject<Konva.Layer>; videoRef: RefObject<Konva.Image> }
) {
  const videoElement = useMemo(() => document.createElement('video'), []);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(
    'loading'
  );

  useEffect(() => {
    videoElement.src = src;
    /* Mute the video because its audio is not wanted, which also allows
    autoplay */
    videoElement.muted = true;
    // Empty animation just to update the layer
    const animation = new Konva.Animation(() => {
      if (videoElement.paused) return false;
    }, layerRef.current);

    function handleLoad() {
      setStatus('loaded');
      animation.start();

      const video = videoRef.current;
      if (!video) return;

      /* Unlike when using `Konva.Image` with an image, when loading a video,
      the node doesn't set the video size automatically, so both the video width
      and height stay at 0 (except when loading a saved canvas tree and the
      dimesions of the video are saved) */
      const areVideoDimensionsSet = video.width() !== 0 && video.height() !== 0;
      if (!areVideoDimensionsSet) {
        video.width(videoElement.videoWidth);
        video.height(videoElement.videoHeight);
      }
    }

    function handleError() {
      setStatus('failed');
    }

    videoElement.addEventListener('loadedmetadata', handleLoad);
    videoElement.addEventListener('error', handleError);
    return () => {
      animation.stop();
      videoElement.removeEventListener('loadedmetadata', handleLoad);
      videoElement.removeEventListener('error', handleError);
    };
  }, [layerRef, src, videoElement, videoRef]);

  return [videoElement, status] as const;
}
