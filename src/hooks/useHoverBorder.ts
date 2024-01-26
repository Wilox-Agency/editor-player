import type { RefObject } from 'react';
import Konva from 'konva';

import { useNodeBeingEditedStore } from '@/hooks/useNodeBeingEditedStore';

export function useHoverBorder({
  hoverBorderTransformerRef,
}: {
  hoverBorderTransformerRef: RefObject<Konva.Transformer>;
}) {
  function getHoverBorderTransformer() {
    const hoverBorderTransformer = hoverBorderTransformerRef.current;
    if (!hoverBorderTransformer) {
      throw new Error(
        'Tried to use `borderTransformerRef` before it was assigned a value'
      );
    }

    return hoverBorderTransformer;
  }

  function handleHoverStart(event: Konva.KonvaEventObject<MouseEvent>) {
    const shouldShowHoverBorder = getShouldShowHoverBorder(event.target);
    if (!shouldShowHoverBorder) return;

    // Select the node with the hover border transformer
    getHoverBorderTransformer().nodes([event.target]);
  }

  function handleHoverEnd() {
    // Clear the selection of the hover border transformer
    getHoverBorderTransformer().nodes([]);
  }

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
