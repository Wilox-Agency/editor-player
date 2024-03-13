import type { PropsWithChildren } from 'react';
import type Konva from 'konva';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Crop,
  Layers,
  Trash2,
} from 'lucide-react';

import styles from './KonvaContextMenu.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';

type ContextMenuProps = PropsWithChildren<{
  startCroppingImage: (image: Konva.Image) => void;
}>;

export function KonvaContextMenu({
  children,
  startCroppingImage,
}: ContextMenuProps) {
  const { layerRef } = useKonvaRefsStore();
  const removeElements = useCanvasTreeStore((state) => state.removeElements);
  const selection = useTransformerSelectionStore((state) => state.selection);
  const selectNodes = useTransformerSelectionStore(
    (state) => state.selectNodes
  );

  function handleStartCroppingImageThroughContextMenu() {
    if (
      Array.isArray(selection) ||
      (selection?.type !== 'image' && selection?.type !== 'video')
    ) {
      return;
    }

    startCroppingImage(selection.node);
  }

  function handleChangeElementZIndex(
    movement: 'moveUp' | 'moveDown' | 'moveToTop' | 'moveToBottom'
  ) {
    if (!selection) return;

    /* Changing the layer of multiple elements at a time will be implemented
    in the future */
    if (Array.isArray(selection)) return;

    // TODO: Remove this as it is unnecessary
    // Moving the node
    selection.node[movement]();
    // Saving the new order
    useCanvasTreeStore.setState((state) => {
      const canvasTreeShallowCopy = [...state.canvasTree];
      const elementIndex = canvasTreeShallowCopy.findIndex((element) => {
        return element.id === selection.node.id();
      });

      if (elementIndex === -1) {
        throw new Error(
          'Could not find moved element in the canvas tree state'
        );
      }

      const lastElementIndex = canvasTreeShallowCopy.length - 1;
      if (movement === 'moveUp' && elementIndex < lastElementIndex) {
        // Swapping the element with the next one
        [
          canvasTreeShallowCopy[elementIndex],
          canvasTreeShallowCopy[elementIndex + 1],
        ] = [
          canvasTreeShallowCopy[elementIndex + 1]!,
          canvasTreeShallowCopy[elementIndex]!,
        ];
      }

      if (movement === 'moveDown' && elementIndex > 0) {
        // Swapping the element with the previous one
        [
          canvasTreeShallowCopy[elementIndex - 1],
          canvasTreeShallowCopy[elementIndex],
        ] = [
          canvasTreeShallowCopy[elementIndex]!,
          canvasTreeShallowCopy[elementIndex - 1]!,
        ];
      }

      if (movement === 'moveToTop' && elementIndex < lastElementIndex) {
        // Removing the element from its original position
        const [removedElement] = canvasTreeShallowCopy.splice(elementIndex, 1);
        // Adding it to the end of the array
        canvasTreeShallowCopy.push(removedElement!);
      }

      if (movement === 'moveToBottom' && elementIndex > 0) {
        // Removing the element from its original position
        const [removedElement] = canvasTreeShallowCopy.splice(elementIndex, 1);
        // Adding it to the start of the array
        canvasTreeShallowCopy.unshift(removedElement!);
      }

      return { canvasTree: canvasTreeShallowCopy };
    });
  }

  function handleRemoveElement() {
    if (!selection) return;

    if (Array.isArray(selection)) {
      removeElements(...selection.map((node) => node.id()));
    } else {
      removeElements(selection.node.id());
    }

    /* Since all and only the nodes being removed are selected, to deselect
    them, simply clear the current selection */
    selectNodes([]);
  }

  const canBeCropped =
    selection !== undefined &&
    !Array.isArray(selection) &&
    ['image', 'video'].includes(selection.type);
  const canChangeLayer = selection !== undefined && !Array.isArray(selection);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      {selection !== undefined && (
        <ContextMenu.Portal>
          <ContextMenu.Content className={styles.contextMenu}>
            {canBeCropped && (
              <ContextMenu.Item
                className={styles.contextMenuItem}
                onClick={handleStartCroppingImageThroughContextMenu}
              >
                <Crop size={14} /> Crop image
              </ContextMenu.Item>
            )}
            {canChangeLayer && layerRef.current && (
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className={styles.contextMenuItem}>
                  <Layers size={14} /> Position{' '}
                  <div className={styles.contextMenuIconRightContainer}>
                    <ChevronRight size={14} />
                  </div>
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent
                    className={styles.contextMenu}
                    sideOffset={4}
                  >
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeElementZIndex('moveUp')}
                      disabled={
                        selection.node.zIndex() ===
                        layerRef.current.children.length - 1
                      }
                    >
                      <ChevronUp size={14} /> Move up
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeElementZIndex('moveDown')}
                      disabled={selection.node.zIndex() === 0}
                    >
                      <ChevronDown size={14} /> Move down
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeElementZIndex('moveToTop')}
                      disabled={
                        selection.node.zIndex() ===
                        layerRef.current.children.length - 1
                      }
                    >
                      <ChevronsUp size={14} /> Move to top
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeElementZIndex('moveToBottom')}
                      disabled={selection.node.zIndex() === 0}
                    >
                      <ChevronsDown size={14} /> Move to bottom
                    </ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
            )}
            <ContextMenu.Item
              className={styles.contextMenuItem}
              onClick={handleRemoveElement}
            >
              <Trash2 size={14} /> Remove
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}
