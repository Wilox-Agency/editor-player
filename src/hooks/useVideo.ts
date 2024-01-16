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
    const animation = new Konva.Animation(() => {}, layerRef.current);

    function handleLoad() {
      setStatus('loaded');
      videoRef.current?.width(videoElement.videoWidth);
      videoRef.current?.height(videoElement.videoHeight);
      animation.start();
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
