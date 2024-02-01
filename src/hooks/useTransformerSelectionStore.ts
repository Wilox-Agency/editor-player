import Konva from 'konva';
import { create } from 'zustand';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { TextSizes } from '@/utils/validation';
import { CustomKonvaAttributes } from '@/utils/konva';
import type { KonvaNodeWithType } from '@/utils/types';

type TransformerSelection = KonvaNodeWithType | Konva.Node[] | undefined;

type TransformerSelectionStore = {
  selection: TransformerSelection;
  nodesInsideSelectionRect: Konva.Node[];
  getSelectedNodes: () => Konva.Node[];
  selectNodes: (nodes: Konva.Node[]) => void;
  setNodesInsideSelectionRect: (nodes: Konva.Node[]) => void;
};

export const useTransformerSelectionStore = create<TransformerSelectionStore>(
  (set, get) => ({
    selection: undefined,
    nodesInsideSelectionRect: [],
    getSelectedNodes: () => {
      const selection = get().selection;
      const selectedNodes = selectionToNodeArray(selection);

      return selectedNodes;
    },
    selectNodes: (nodesToSelect) => {
      const transformer = getTransformer();
      const filteredNodesToSelect = nodesToSelect.filter(getIsNodeSelectable);
      const newSelection = nodeArrayToSelection(nodesToSelect);

      setTransformerAttributes(transformer, filteredNodesToSelect);
      transformer.nodes(filteredNodesToSelect);
      set({ selection: newSelection });
    },
    setNodesInsideSelectionRect(nodes: Konva.Node[]) {
      set({ nodesInsideSelectionRect: nodes });
    },
  })
);

function getTransformer() {
  const transformer = useKonvaRefsStore.getState().transformerRef.current;
  if (!transformer) {
    throw new Error(
      'Tried to use `transformerRef` before it was assigned a value'
    );
  }

  return transformer;
}

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

export function selectionToNodeArray(
  selection: TransformerSelection
): Konva.Node[] {
  if (selection === undefined) return [];
  if (!Array.isArray(selection)) return [selection.node];
  return selection;
}

export function getIsNodeSelectable(node: Konva.Node) {
  return (
    // Cannot select the stage
    !(node instanceof Konva.Stage) &&
    // Cannot select nodes from the controllers layer
    node.getLayer()?.name() !== 'controllers' &&
    // Cannot select node with the 'unselectable' attribute
    !node.getAttr(CustomKonvaAttributes.unselectable) &&
    // Cannot select invisible nodes
    node.visible()
  );
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
      keepRatio: undefined,
      rotateEnabled: undefined,
      boundBoxFunc: (oldBox, newBox) => {
        const text = nodes[0] as Konva.Text;

        const activeAnchor = transformer.getActiveAnchor();
        // The middle anchors are only for resizing the width
        const isResizingOnlyWidth =
          activeAnchor && activeAnchor.startsWith('middle');
        if (isResizingOnlyWidth) {
          const currentMinWidth = Math.max(
            text.fontSize(),
            TextSizes.minFontSize
          );
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
      keepRatio: undefined,
      rotateEnabled: false,
      boundBoxFunc: undefined,
    } satisfies Konva.TransformerConfig);
    return;
  }

  const isRect = nodes.length === 1 && nodes[0] instanceof Konva.Rect;
  if (isRect) {
    transformer.setAttrs({
      enabledAnchors: undefined,
      keepRatio: false,
      rotateEnabled: undefined,
      boundBoxFunc: undefined,
    } satisfies Konva.TransformerConfig);
    return;
  }

  const isMultiSelect = nodes.length > 1;
  if (isMultiSelect) {
    transformer.setAttrs({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      keepRatio: undefined,
      rotateEnabled: false,
      boundBoxFunc: undefined,
    } satisfies Konva.TransformerConfig);
    return;
  }

  transformer.setAttrs({
    enabledAnchors: undefined,
    keepRatio: undefined,
    rotateEnabled: undefined,
    boundBoxFunc: undefined,
  } satisfies Konva.TransformerConfig);
}
