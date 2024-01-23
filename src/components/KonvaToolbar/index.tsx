import { useEffect, useState } from 'react';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Image,
  PlusSquare,
  Save,
  Text,
  Type,
  Video,
} from 'lucide-react';

import styles from './KonvaToolbar.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import {
  CustomKonvaAttributes,
  waitUntilKonvaNodeSizeIsCalculated,
} from '@/utils/konva';
import type { CanvasElement } from '@/utils/types';

import { Tooltip, TooltipProvider } from '@/components/Tooltip';
import { AddAssetElementDialog } from './AddAssetElementDialog';

const defaultElementAttributes = {
  video: {
    draggable: true,
  },
  image: {
    draggable: true,
  },
  text: {
    text: 'Text',
    fill: 'white',
    fontSize: 32,
    align: 'center',
    draggable: true,
  },
} satisfies {
  [K in CanvasElement['type']]: Partial<
    Omit<Extract<CanvasElement, { type: K }>, 'id' | 'type'>
  >;
};

const mediumIconSize = 18;
const smallIconSize = 14;
const popoverOffset = 12;
const tooltipOffset = 4;

export function KonvaToolbar() {
  return (
    <TooltipProvider>
      <Toolbar.Root className={styles.toolbar} orientation="vertical">
        <AddElementButton />

        <Toolbar.Separator className={styles.toolbarSeparator} />

        <TextAlignmentButton />

        <Toolbar.Separator className={styles.toolbarSeparator} />

        <SaveButton />
      </Toolbar.Root>
    </TooltipProvider>
  );
}

function AddElementButton() {
  const { layerRef } = useKonvaRefsStore();
  const addElement = useCanvasTreeStore((state) => state.addElement);
  const updateElement = useCanvasTreeStore((state) => state.updateElement);
  const selectNodes = useTransformerSelectionStore(
    (state) => state.selectNodes
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [idOfNewlyCreatedElement, setIdOfNewlyCreatedElement] = useState<
    string | undefined
  >();

  function handleAddElement<T extends CanvasElement['type']>(
    type: T,
    attrs?: Omit<Extract<CanvasElement, { type: T }>, 'id' | 'type'>
  ) {
    // Add the element
    const { id } = addElement({
      type,
      ...defaultElementAttributes[type],
      ...attrs,
    } as Parameters<typeof addElement>[0]);
    setIdOfNewlyCreatedElement(id);

    // Close the popover
    setIsPopoverOpen(false);
  }

  /* Center, resize (if needed) and select the newly created element (after
  creating one) */
  useEffect(() => {
    (async () => {
      if (!idOfNewlyCreatedElement) return;

      setIdOfNewlyCreatedElement(undefined);

      const layer = layerRef.current;
      if (!layer) return;

      const node = layer.findOne(`#${idOfNewlyCreatedElement}`);
      if (!node) return;

      // Hide the node before centering and selecting it
      node.visible(false);
      node.setAttr(CustomKonvaAttributes.unselectable, true);

      // Wait until the node size is calculated
      await waitUntilKonvaNodeSizeIsCalculated(node);

      const isNodeOverflowingCanvas =
        node.width() > layer.width() || node.height() > layer.height();
      // Reduce node size if it overflows the canvas
      if (isNodeOverflowingCanvas) {
        const layerAspectRatio = layer.width() / layer.height();
        const nodeAspectRatio = node.width() / node.height();

        if (nodeAspectRatio >= layerAspectRatio) {
          const scale = layer.width() / node.width();
          node.size({
            width: layer.width(),
            height: node.height() * scale,
          });
        } else {
          const scale = layer.height() / node.height();
          node.size({
            width: node.width() * scale,
            height: layer.height(),
          });
        }
      }

      // Center the node
      node.position({
        x: layer.width() / 2 - node.width() / 2,
        y: layer.height() / 2 - node.height() / 2,
      });

      // Save the new position and size
      updateElement(idOfNewlyCreatedElement, {
        ...node.position(),
        ...node.size(),
      });

      // Select the node
      selectNodes([node]);

      // Show the node
      node.visible(true);
      node.setAttr(CustomKonvaAttributes.unselectable, undefined);
    })();
  }, [idOfNewlyCreatedElement, layerRef, selectNodes, updateElement]);

  return (
    <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <Tooltip content="Add element" side="right" sideOffset={tooltipOffset}>
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <PlusSquare size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          side="right"
          sideOffset={popoverOffset}
        >
          <button
            className={styles.toolbarButton}
            onClick={() => handleAddElement('text')}
          >
            <Type size={smallIconSize} />
            Text
          </button>

          <AddAssetElementDialog type="image" onAddElement={handleAddElement}>
            <button className={styles.toolbarButton}>
              <Image size={smallIconSize} />
              Image
            </button>
          </AddAssetElementDialog>

          <AddAssetElementDialog type="video" onAddElement={handleAddElement}>
            <button className={styles.toolbarButton}>
              <Video size={smallIconSize} />
              Video
            </button>
          </AddAssetElementDialog>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TextAlignmentButton() {
  return (
    <Popover.Root>
      <Tooltip content="Text alignment" side="right" sideOffset={tooltipOffset}>
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            {/* TODO: Show icon equivalent to the selected text alignment */}
            <Text size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          side="right"
          sideOffset={popoverOffset}
        >
          <RadioGroup.Root
            className={styles.toggleGroup}
            orientation="horizontal"
            defaultValue="center"
            loop={false}
          >
            <RadioGroup.Item
              className={styles.toolbarButton}
              value="left"
              aria-label="Left aligned"
              data-icon-only
            >
              <AlignLeft size={mediumIconSize} />
            </RadioGroup.Item>
            <RadioGroup.Item
              className={styles.toolbarButton}
              value="center"
              aria-label="Center aligned"
              data-icon-only
              // TODO: Auto focus should be in the selected one
              autoFocus
            >
              <AlignCenter size={mediumIconSize} />
            </RadioGroup.Item>
            <RadioGroup.Item
              className={styles.toolbarButton}
              value="right"
              aria-label="Right aligned"
              data-icon-only
            >
              <AlignRight size={mediumIconSize} />
            </RadioGroup.Item>
          </RadioGroup.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SaveButton() {
  function handleSaveCanvasTree() {
    const string = JSON.stringify(useCanvasTreeStore.getState().canvasTree);
    localStorage.setItem('@sophia-slide-editor:canvas-tree', string);
  }

  return (
    <Tooltip content="Save" side="right" sideOffset={tooltipOffset}>
      <Toolbar.Button
        className={styles.toolbarButton}
        onClick={handleSaveCanvasTree}
        data-icon-only
      >
        <Save size={mediumIconSize} />
      </Toolbar.Button>
    </Tooltip>
  );
}
