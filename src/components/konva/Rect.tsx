import { forwardRef, useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Rect as KonvaRect } from 'react-konva';

import { mergeRefs } from '@/utils/mergeRefs';
import type {
  CanvasElementOfTypeWithActions,
  RemoveIndex,
} from '@/utils/types';

export type RectProps = Pick<
  RemoveIndex<Konva.RectConfig>,
  | 'id'
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'fill'
  | 'strokeEnabled'
  | 'stroke'
  | 'strokeWidth'
  | 'dashEnabled'
  | 'dash'
  | 'cornerRadius'
  | 'rotation'
  | 'draggable'
> & {
  saveAttrs: CanvasElementOfTypeWithActions<'rect'>['saveAttrs'];
  remove: () => void;
};

export const Rect = forwardRef<Konva.Rect, RectProps>(
  ({ id, saveAttrs, ...initialAttributes }, forwardedRef) => {
    const rectRef = useRef<Konva.Rect>(null);

    function handleRectTransformEnd(event: Konva.KonvaEventObject<Event>) {
      const rect = event.target as Konva.Rect;

      /* Updating the size according to the scale, while also resetting the
      scale */
      rect.setAttrs({
        width: rect.width() * rect.scaleX(),
        height: rect.height() * rect.scaleY(),
        scaleX: 1,
        scaleY: 1,
      } satisfies Partial<Konva.RectConfig>);
      // Saving the new position and size
      saveAttrs({
        x: rect.x(),
        y: rect.y(),
        width: rect.width(),
        height: rect.height(),
        rotation: rect.rotation(),
      });
    }
    function handleRectDragEnd(event: Konva.KonvaEventObject<DragEvent>) {
      // Saving the new position
      saveAttrs({ x: event.target.x(), y: event.target.y() });
    }

    // Setting the initial attributes only on the first render
    useEffect(() => {
      rectRef.current?.setAttrs(
        initialAttributes satisfies Partial<Konva.RectConfig>
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <KonvaRect
        id={id}
        strokeScaleEnabled={false}
        onTransformEnd={handleRectTransformEnd}
        onDragEnd={handleRectDragEnd}
        ref={mergeRefs(rectRef, forwardedRef)}
      />
    );
  }
);
