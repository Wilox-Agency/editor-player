import { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Layer } from 'react-konva';

import { usePlayerTimelineStore } from '@/hooks/usePlayerTimeline';
import { CanvasComponentByType } from '@/utils/konva';
import type { CanvasElement } from '@/utils/types';

export function PlayerThumbnail({
  firstSlideElements,
}: {
  firstSlideElements: CanvasElement[] | undefined;
}) {
  const layerRef = useRef<Konva.Layer>(null);
  const timelineState = usePlayerTimelineStore((state) => state.timelineState);

  useEffect(() => {
    if (timelineState !== 'notStarted') return;

    const animation = new Konva.Animation(() => {}, layerRef.current);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [timelineState]);

  if (timelineState !== 'notStarted') return null;

  return (
    <Layer listening={false} ref={layerRef}>
      {firstSlideElements?.map((element) => {
        const { type, ...props } = element;
        const Component = CanvasComponentByType[type];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <Component key={props.id} {...(props as any)} />;
      })}
    </Layer>
  );
}
