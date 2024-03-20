import { useEffect } from 'react';
import Konva from 'konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import {
  getIsNodeSelectable,
  useTransformerSelectionStore,
} from '@/hooks/useTransformerSelectionStore';
import { MouseButton } from '@/utils/input';

export function useTransformer() {
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

    /* When clicking on an empty area (i.e. clicking directly the stage), clear
    the selection */
    if (event.target instanceof Konva.Stage) {
      selectNodes([]);
      return;
    }

    // Prevent selecting unselectable elements
    const isNodeSelectable = getIsNodeSelectable(event.target);
    if (!isNodeSelectable) return;

    const hasModifierKey =
      event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;

    // When none of the modifier keys are pressed, select the clicked node
    if (!hasModifierKey) {
      selectNodes([event.target]);
      return;
    }

    const isTargetAlreadySelected =
      getSelectedNodes().indexOf(event.target) >= 0;

    /* When any of the modifier keys is pressed, add/remove the node from
    the current selection */
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
