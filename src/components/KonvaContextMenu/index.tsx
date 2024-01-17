import { type PropsWithChildren, useContext } from 'react';
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
import { useContextMenuStore } from '@/hooks/useContextMenuStore';
import { KonvaContext } from '@/contexts/KonvaContext';

type ContextMenuProps = PropsWithChildren<{
  startCroppingImage: (image: Konva.Image) => void;
}>;

export function KonvaContextMenu({
  children,
  startCroppingImage,
}: ContextMenuProps) {
  const { layerRef, transformerRef } = useContext(KonvaContext);
  const removeElements = useCanvasTreeStore((state) => state.removeElements);
  const { selection } = useContextMenuStore();

  function handleStartCroppingImageThroughContextMenu() {
    if (
      Array.isArray(selection) ||
      (selection?.type !== 'image' && selection?.type !== 'video')
    ) {
      return;
    }

    startCroppingImage(selection.node);
  }

  function handleChangeLayer(
    movement: 'moveUp' | 'moveDown' | 'moveToTop' | 'moveToBottom'
  ) {
    if (!selection) return;

    /* Changing the layer of multiple elements at a time will be implemented
    in the future */
    if (Array.isArray(selection)) return;

    selection.node[movement]();
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
    transformerRef.current?.nodes([]);
  }

  const canBeCropped =
    selection !== undefined &&
    !Array.isArray(selection) &&
    ['image', 'video'].includes(selection.type);
  const canChangeLayer = selection !== undefined && !Array.isArray(selection);

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        // Clearing the context menu selection when it closes
        if (!open) useContextMenuStore.setState({ selection: undefined });
      }}
    >
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
                      onClick={() => handleChangeLayer('moveUp')}
                      disabled={
                        selection.node.zIndex() ===
                        layerRef.current.children.length - 1
                      }
                    >
                      <ChevronUp size={14} /> Move up
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeLayer('moveDown')}
                      disabled={selection.node.zIndex() === 0}
                    >
                      <ChevronDown size={14} /> Move down
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeLayer('moveToTop')}
                      disabled={
                        selection.node.zIndex() ===
                        layerRef.current.children.length - 1
                      }
                    >
                      <ChevronsUp size={14} /> Move to top
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={styles.contextMenuItem}
                      onClick={() => handleChangeLayer('moveToBottom')}
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
