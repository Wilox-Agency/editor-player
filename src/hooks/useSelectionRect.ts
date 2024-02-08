import { type RefObject, useEffect, useRef } from 'react';
import Konva from 'konva';

import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { convertScale } from '@/utils/konva';
import { MouseButton } from '@/utils/input';

export function useSelectionRect({
  stageRef,
  layerRef,
  selectionRectRef,
}: {
  stageRef: RefObject<Konva.Stage>;
  layerRef: RefObject<Konva.Layer>;
  selectionRectRef: RefObject<Konva.Rect>;
}) {
  const coordinatesRef = useRef({
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0,
  });
  const isSelectingRef = useRef(false);

  const selectNodes = useTransformerSelectionStore(
    (state) => state.selectNodes
  );
  const setNodesInsideSelectionRect = useTransformerSelectionStore(
    (state) => state.setNodesInsideSelectionRect
  );

  function handleStartSelectionRect(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    // Only accept clicks from the left mouse button
    if (
      event.evt instanceof MouseEvent &&
      event.evt.button !== MouseButton.left
    ) {
      return;
    }

    const stage = stageRef.current;
    const selectionRect = selectionRectRef.current;
    if (!stage || !selectionRect) return;

    // Do nothing when mousedown not on stage
    if (event.target !== stage) return;

    const pointerPosition = convertScale(stage.getPointerPosition()!, {
      to: 'unscaled',
    });
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
      const pointerPosition = convertScale(stage.getPointerPosition()!, {
        to: 'unscaled',
      });
      coordinates.currentX = pointerPosition.x;
      coordinates.currentY = pointerPosition.y;

      selectionRect.setAttrs({
        visible: true,
        x: Math.min(coordinates.initialX, coordinates.currentX),
        y: Math.min(coordinates.initialY, coordinates.currentY),
        width: Math.abs(coordinates.currentX - coordinates.initialX),
        height: Math.abs(coordinates.currentY - coordinates.initialY),
      } satisfies Konva.RectConfig);

      const layer = layerRef.current;
      if (!layer) return;

      const nodesToSelect = getIntersectingNodes(selectionRect, layer);
      setNodesInsideSelectionRect(nodesToSelect);
    }

    function handleWindowMouseUp() {
      isSelectingRef.current = false;

      const layer = layerRef.current;
      const selectionRect = selectionRectRef.current;
      if (!layer || !selectionRect) return;

      // Do nothing when there's no selection active
      if (!selectionRect.visible()) return;

      selectionRect.visible(false);
      const nodesToSelect = getIntersectingNodes(selectionRect, layer);
      // Select the nodes
      selectNodes(nodesToSelect);
      // Clear the nodes inside the selection rect
      setNodesInsideSelectionRect([]);
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
  }, [
    layerRef,
    selectNodes,
    selectionRectRef,
    setNodesInsideSelectionRect,
    stageRef,
  ]);

  return {
    /**
     * The `onMouseDown`/`onTouchStart` event handler to be used in your
     * `Stage` component from `react-konva`.
     */
    handleStartSelectionRect,
  };
}

function getIntersectingNodes(selectionRect: Konva.Rect, layer: Konva.Layer) {
  const selectionClientRect = selectionRect.getClientRect();
  /* No need to filter out the nodes that are from the 'controllers' layer
      because we're only getting the children from the correct layer */
  const nodesToSelect = layer.getChildren((node) => {
    const isIntersecting = Konva.Util.haveIntersection(
      selectionClientRect,
      node.getClientRect()
    );
    return isIntersecting;
  });

  return nodesToSelect;
}
