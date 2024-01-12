import { type RefObject, useEffect, useRef } from 'react';
import Konva from 'konva';

import { setTransformerAttributes } from '@/hooks/useTransformer';

const MouseButton = { left: 0, middle: 1, right: 2 } as const;

export function useSelectionRect({
  stageRef,
  layerRef,
  transformerRef,
  selectionRectRef,
}: {
  stageRef: RefObject<Konva.Stage>;
  layerRef: RefObject<Konva.Layer>;
  transformerRef: RefObject<Konva.Transformer>;
  selectionRectRef: RefObject<Konva.Rect>;
}) {
  const coordinatesRef = useRef({
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0,
  });
  const isSelectingRef = useRef(false);

  function handleStartSelectionRect(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    const stage = stageRef.current;
    const selectionRect = selectionRectRef.current;
    if (!stage || !selectionRect) return;

    // Do nothing when mousedown not on stage
    if (event.target !== stage) return;

    // Do nothing when not left clicking
    const isMouseLeftClick =
      event.evt instanceof MouseEvent && event.evt.button === MouseButton.left;
    if (!isMouseLeftClick) return;

    const pointerPosition = stage.getPointerPosition()!;
    coordinatesRef.current = {
      initialX: pointerPosition.x,
      initialY: pointerPosition.y,
      currentX: pointerPosition.x,
      currentY: pointerPosition.y,
    };

    selectionRect.width(0);
    selectionRect.height(0);
    isSelectingRef.current = true;
  }

  // Setup window event listeners for selection rect
  useEffect(() => {
    function handleWindowMouseMove() {
      const stage = stageRef.current;
      const selectionRect = selectionRectRef.current;
      if (!stage || !selectionRect) return;

      // Do nothing when user is not selecting
      if (!isSelectingRef.current) return;

      const coordinates = coordinatesRef.current;
      const pointerPosition = stage.getPointerPosition()!;
      coordinates.currentX = pointerPosition.x;
      coordinates.currentY = pointerPosition.y;

      selectionRect.setAttrs({
        visible: true,
        x: Math.min(coordinates.initialX, coordinates.currentX),
        y: Math.min(coordinates.initialY, coordinates.currentY),
        width: Math.abs(coordinates.currentX - coordinates.initialX),
        height: Math.abs(coordinates.currentY - coordinates.initialY),
      } satisfies Konva.RectConfig);
    }

    function handleWindowMouseUp() {
      isSelectingRef.current = false;

      const layer = layerRef.current;
      const transformer = transformerRef.current;
      const selectionRect = selectionRectRef.current;
      if (!layer || !transformer || !selectionRect) return;

      // Do nothing when there's no selection active
      if (!selectionRect.visible()) return;

      selectionRect.visible(false);
      const selectionClientRect = selectionRect.getClientRect();
      const selectedNodes = layer.getChildren((node) => {
        const isIntersecting = Konva.Util.haveIntersection(
          selectionClientRect,
          node.getClientRect()
        );
        return isIntersecting;
      });

      setTransformerAttributes(transformer, selectedNodes);
      transformer.nodes(selectedNodes);
    }

    // Setting mousemove listeners
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('touchmove', handleWindowMouseMove);
    // Setting mouseup listeners
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchend', handleWindowMouseUp);
    return () => {
      // Removing mousemove listeners
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('touchmove', handleWindowMouseMove);
      // Removing mouseup listeners
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [layerRef, selectionRectRef, stageRef, transformerRef]);

  return {
    /**
     * The `onMouseDown`/`onTouchStart` event handler to be used in your
     * `Stage` component from `react-konva`.
     */
    handleStartSelectionRect,
  };
}
