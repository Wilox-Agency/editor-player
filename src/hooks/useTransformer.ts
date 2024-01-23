import { type RefObject, useEffect } from 'react';
import Konva from 'konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { CustomKonvaAttributes } from '@/utils/konva';

export const TEXT_MIN_FONT_SIZE = 12;

export function useTransformer({
  stageRef,
  transformerRef,
}: {
  stageRef: RefObject<Konva.Stage>;
  transformerRef: RefObject<Konva.Transformer>;
}) {
  const removeElements = useCanvasTreeStore((state) => state.removeElements);
  const selectNodes = useTransformerSelectionStore(
    (state) => state.selectNodes
  );

  function handleSelectNode(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    const transformer = transformerRef.current;
    if (!transformer) return;

    // When clicking on an empty area, clear the selection
    if (event.target === stageRef.current) {
      selectNodes(transformer, []);
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
      selectNodes(transformer, [event.target]);
      return;
    }

    const isTargetAlreadySelected =
      transformer.nodes().indexOf(event.target) >= 0;

    // When it's meta press, add/remove the node from the current selection
    if (isTargetAlreadySelected) {
      const nodesWithoutTarget = transformer
        .nodes()
        .filter((node) => node !== event.target);
      selectNodes(transformer, nodesWithoutTarget);
    } else {
      const nodesWithTarget = [...transformer.nodes(), event.target];
      selectNodes(transformer, nodesWithTarget);
    }
  }

  // Setup window event listeners for transformer
  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      const transformer = transformerRef.current;
      if (!transformer) return;

      const selectionExists = transformer.nodes().length > 0;
      // Clear selection when pressing Escape with a selection active
      if (event.key === 'Escape' && selectionExists) {
        // Prevent leaving fullscreen
        event.preventDefault();
        selectNodes(transformer, []);
      }

      // Remove selected nodes when pressing Delete with a selection active
      if (event.key === 'Delete' && selectionExists) {
        const nodeIds = transformer.nodes().map((node) => node.id());
        // Clear selection before removing the nodes
        selectNodes(transformer, []);

        removeElements(...nodeIds);
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [removeElements, selectNodes, transformerRef]);

  return {
    /**
     * The `onClick` event handler to be used in your `Stage` component from
     * `react-konva`.
     */
    handleSelectNode,
  };
}
