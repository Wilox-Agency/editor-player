import { type RefObject, useEffect, useCallback } from 'react';
import Konva from 'konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useNodeBeingEditedStore } from '@/hooks/useNodeBeingEditedStore';

export function useHoverBorder({
  hoverBorderTransformerRef,
}: {
  hoverBorderTransformerRef: RefObject<Konva.Transformer>;
}) {
  const canvasTree = useCanvasTreeStore((state) => state.canvasTree);

  const getHoverBorderTransformer = useCallback(() => {
    const hoverBorderTransformer = hoverBorderTransformerRef.current;
    if (!hoverBorderTransformer) {
      throw new Error(
        'Tried to use `borderTransformerRef` before it was assigned a value'
      );
    }

    return hoverBorderTransformer;
  }, [hoverBorderTransformerRef]);

  function handleHoverStart(event: Konva.KonvaEventObject<MouseEvent>) {
    const shouldShowHoverBorder = getShouldShowHoverBorder(event.target);
    if (!shouldShowHoverBorder) return;

    // Show hover border
    getHoverBorderTransformer().nodes([event.target]);
  }

  function handleHoverEnd() {
    // Hide hover border
    getHoverBorderTransformer().nodes([]);
  }

  // Hide the hover border if the hovered node gets deleted
  useEffect(() => {
    const hoverBorderTransformer = getHoverBorderTransformer();
    const nodeWithHover = hoverBorderTransformer.nodes()[0];
    if (!nodeWithHover) return;

    const nodeStillExists = canvasTree.some(
      (element) => element.id === nodeWithHover.id()
    );
    if (!nodeStillExists) {
      // Hide hover border when node with hover doesn't exist anymore
      hoverBorderTransformer.nodes([]);
    }
  }, [getHoverBorderTransformer, canvasTree]);

  return {
    /**
     * The `onMouseOver`/`onMouseMove` event handler to be used in your `Stage`
     * component from `react-konva`.
     */
    handleHoverStart,
    /**
     * The `onMouseOut` event handler to be used in your `Stage` component from
     * `react-konva`.
     */
    handleHoverEnd,
  };
}

function getShouldShowHoverBorder(node: Konva.Node) {
  const nodeBeingEdited = useNodeBeingEditedStore
    .getState()
    .getNodeBeingEdited();

  return (
    // Stage should not have hover border
    !(node instanceof Konva.Stage) &&
    // Nodes from the controllers layer should not have hover border
    node.getLayer()?.name() !== 'controllers' &&
    // Nodes being edited should not have hover border
    node.id() !== nodeBeingEdited?.id() &&
    // Invisible nodes should not have hover border
    node.visible()
  );
}
