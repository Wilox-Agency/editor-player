import { forwardRef, useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Rect as KonvaRect } from 'react-konva';

import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
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
    const { transformerRef } = useKonvaRefsStore();
    const rectRef = useRef<Konva.Rect>(null);

    /* This handler is necessary to prevent deforming the corner radius when
    transforming the rect */
    function handleRectTransform(event: Konva.KonvaEventObject<Event>) {
      const rect = event.target as Konva.Rect;
      /* Asserting the corner radius as a number because there's no way to
      modify it as an array */
      const hasCornerRadius = (rect.cornerRadius() as number) > 0;
      if (!hasCornerRadius) return;

      const activeAnchor = transformerRef.current?.getActiveAnchor();
      const isRotating = activeAnchor && activeAnchor.startsWith('rotater');
      // No need to do anything when rotating
      if (isRotating) return;

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
      });
    }

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
        onTransform={handleRectTransform}
        onTransformEnd={handleRectTransformEnd}
        onDragEnd={handleRectDragEnd}
        ref={mergeRefs(rectRef, forwardedRef)}
      />
    );
  }
);
