import { Layer } from 'react-konva';

import { usePlayerTimelineStore } from '@/hooks/usePlayerTimeline';
import { CanvasComponentByType } from '@/utils/konva';
import type { CanvasElement } from '@/utils/types';

export function PlayerThumbnail({
  firstSlideElements,
}: {
  firstSlideElements: CanvasElement[] | undefined;
}) {
  const timelineState = usePlayerTimelineStore((state) => state.timelineState);

  if (timelineState !== 'notStarted') return null;

  return (
    <Layer listening={false}>
      {firstSlideElements?.map((element) => {
        const { type, ...props } = element;
        const Component = CanvasComponentByType[type];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <Component key={props.id} {...(props as any)} />;
      })}
    </Layer>
  );
}
