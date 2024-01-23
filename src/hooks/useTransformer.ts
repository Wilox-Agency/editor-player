import { type RefObject, useEffect } from 'react';
import Konva from 'konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useContextMenuStore } from '@/hooks/useContextMenuStore';
import { CustomKonvaAttributes } from '@/utils/konva';

export const TEXT_MIN_FONT_SIZE = 12;

export function setTransformerAttributes(
  transformer: Konva.Transformer,
  nodes: Konva.Node[]
) {
  const isText = nodes.length === 1 && nodes[0] instanceof Konva.Text;
  if (isText) {
    transformer.setAttrs({
      enabledAnchors: [
        'top-left',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-right',
      ],
      rotateEnabled: undefined,
      boundBoxFunc: (oldBox, newBox) => {
        const text = nodes[0] as Konva.Text;

        const activeAnchor = transformer.getActiveAnchor();
        // The middle anchors are only for resizing the width
        const isResizingOnlyWidth =
          activeAnchor && activeAnchor.startsWith('middle');
        if (isResizingOnlyWidth) {
          const currentMinWidth = Math.max(text.fontSize(), TEXT_MIN_FONT_SIZE);
          if (Math.abs(newBox.width) < currentMinWidth) {
            return { ...oldBox, width: currentMinWidth };
          }
        }

        return newBox;
      },
    } satisfies Konva.TransformerConfig);
    return;
  }

  const isImage = nodes.length === 1 && nodes[0] instanceof Konva.Image;
  if (isImage) {
    transformer.setAttrs({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotateEnabled: false,
      boundBoxFunc: undefined,
    } satisfies Konva.TransformerConfig);
    return;
  }

  const isMultiSelect = nodes.length > 1;
  if (isMultiSelect) {
    transformer.setAttrs({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotateEnabled: false,
      boundBoxFunc: undefined,
    } satisfies Konva.TransformerConfig);
    return;
  }

  transformer.setAttrs({
    enabledAnchors: undefined,
    rotateEnabled: undefined,
    boundBoxFunc: undefined,
  } satisfies Konva.TransformerConfig);
}

export function useTransformer({
  stageRef,
  transformerRef,
}: {
  stageRef: RefObject<Konva.Stage>;
  transformerRef: RefObject<Konva.Transformer>;
}) {
  const removeElements = useCanvasTreeStore((state) => state.removeElements);

  function handleSelectNode(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    const transformer = transformerRef.current;
    if (!transformer) return;

    // When clicking on an empty area, clear the selection
    if (event.target === stageRef.current) {
      transformer.nodes([]);
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
    const isTargetAlreadySelected =
      transformer.nodes().indexOf(event.target) >= 0;

    if (!isMetaPress) {
      setTransformerAttributes(transformer, [event.target]);
      transformer.nodes([event.target]);
      return;
    }

    if (isTargetAlreadySelected) {
      const nodesWithoutTarget = transformer
        .nodes()
        .filter((node) => node !== event.target);
      setTransformerAttributes(transformer, nodesWithoutTarget);
      transformer.nodes(nodesWithoutTarget);
    } else {
      const nodesWithTarget = [...transformer.nodes(), event.target];
      setTransformerAttributes(transformer, nodesWithTarget);
      transformer.nodes(nodesWithTarget);
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
        transformer.nodes([]);
      }

      // Remove selected nodes when pressing Delete with a selection active
      if (event.key === 'Delete' && selectionExists) {
        const nodeIds = transformer.nodes().map((node) => node.id());
        // Clear selection before removing the nodes
        transformer.nodes([]);

        const contextMenuSelection = useContextMenuStore.getState().selection;
        // Closing the context menu (if open) before removing the nodes
        if (contextMenuSelection) {
          useContextMenuStore.setState({ selection: undefined });
        }

        removeElements(...nodeIds);
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [removeElements, transformerRef]);

  return {
    /**
     * The `onClick` event handler to be used in your `Stage` component from
     * `react-konva`.
     */
    handleSelectNode,
  };
}
