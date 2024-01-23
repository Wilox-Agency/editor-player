import Konva from 'konva';
import { create } from 'zustand';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { TEXT_MIN_FONT_SIZE } from '@/hooks/useTransformer';
import { CustomKonvaAttributes } from '@/utils/konva';
import type { KonvaNodeWithType } from '@/utils/types';

type TransformerSelection = KonvaNodeWithType | Konva.Node[] | undefined;

type TransformerSelectionStore = {
  selection: TransformerSelection;
  selectNodes: (transformer: Konva.Transformer, nodes: Konva.Node[]) => void;
};

export const useTransformerSelectionStore = create<TransformerSelectionStore>(
  (set) => ({
    selection: undefined,
    selectNodes: (transformer, nodesToSelect) => {
      const newSelection = nodeArrayToSelection(nodesToSelect);
      const filteredSelection = filterSelection(newSelection);

      setTransformerAttributes(transformer, nodesToSelect);
      transformer.nodes(nodesToSelect);
      set({ selection: filteredSelection });
    },
  })
);

function nodeArrayToSelection(nodes: Konva.Node[]): TransformerSelection {
  if (nodes.length === 0) return undefined;

  if (nodes.length === 1) {
    const node = nodes[0]!;
    const elementFromStore = useCanvasTreeStore
      .getState()
      .canvasTree.find((element) => element.id === node.id());

    if (!elementFromStore) return undefined;

    return { type: elementFromStore.type, node } as KonvaNodeWithType;
  }

  return nodes;
}

function filterSelection(
  selection: TransformerSelection
): TransformerSelection {
  if (selection === undefined) return undefined;

  if (!Array.isArray(selection)) {
    const node = selection.node;
    const isSelectable =
      !node.getAttr(CustomKonvaAttributes.unselectable) && node.visible();
    if (!isSelectable) return undefined;

    return selection;
  }

  const filteredSelection = selection.filter((node) => {
    const isSelectable =
      !node.getAttr(CustomKonvaAttributes.unselectable) && node.visible();
    return isSelectable;
  });

  if (filteredSelection.length === 0) return undefined;

  if (filteredSelection.length === 1) {
    const node = filteredSelection[0]!;
    const elementFromStore = useCanvasTreeStore
      .getState()
      .canvasTree.find((element) => element.id === node.id());

    if (!elementFromStore) return undefined;

    return { type: elementFromStore.type, node } as KonvaNodeWithType;
  }

  return filteredSelection;
}

function setTransformerAttributes(
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
