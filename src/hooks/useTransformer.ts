import { type RefObject, useEffect } from 'react';
import Konva from 'konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { CustomKonvaAttributes } from '@/utils/konva';
import { MouseButton } from '@/utils/input';

export function useTransformer({
  stageRef,
}: {
  stageRef: RefObject<Konva.Stage>;
}) {
  const removeElements = useCanvasTreeStore((state) => state.removeElements);
  const getSelectedNodes = useTransformerSelectionStore(
    (state) => state.getSelectedNodes
  );
  const selectNodes = useTransformerSelectionStore(
    (state) => state.selectNodes
  );

  function handleSelectNode(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    // Only accept clicks from the left mouse button
    if (
      event.evt instanceof MouseEvent &&
      event.evt.button !== MouseButton.left
    ) {
      return;
    }

    // When clicking on an empty area, clear the selection
    if (event.target === stageRef.current) {
      selectNodes([]);
      return;
    }

    // Prevent selecting any node in the controllers layer
    const layerName = event.target.getLayer()?.name();
    if (layerName === 'controllers') return;

    // Prevent selecting unselectable elements
    const elementIsUnselectable =
      event.target.getAttr(CustomKonvaAttributes.unselectable) === true;
    if (elementIsUnselectable) return;

    const isMetaPress =
      event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;

    // When it's not meta press, select the clicked node
    if (!isMetaPress) {
      selectNodes([event.target]);
      return;
    }

    const isTargetAlreadySelected =
      getSelectedNodes().indexOf(event.target) >= 0;

    // When it's meta press, add/remove the node from the current selection
    if (isTargetAlreadySelected) {
      const nodesWithoutTarget = getSelectedNodes().filter(
        (node) => node !== event.target
      );
      selectNodes(nodesWithoutTarget);
    } else {
      const nodesWithTarget = [...getSelectedNodes(), event.target];
      selectNodes(nodesWithTarget);
    }
  }

  // Setup window event listeners for transformer
  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      const selectionExists = getSelectedNodes().length > 0;
      // Clear selection when pressing Escape with a selection active
      if (event.key === 'Escape' && selectionExists) {
        // Prevent leaving fullscreen
        event.preventDefault();
        selectNodes([]);
      }

      // Remove selected nodes when pressing Delete with a selection active
      if (event.key === 'Delete' && selectionExists) {
        const nodeIds = getSelectedNodes().map((node) => node.id());
        // Clear selection before removing the nodes
        selectNodes([]);

        removeElements(...nodeIds);
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [getSelectedNodes, removeElements, selectNodes]);

  return {
    /**
     * The `onClick`/`onTap` event handler to be used in your `Stage` component
     * from `react-konva`.
     */
    handleSelectNode,
  };
}
