import { useEffect, useMemo, useState } from 'react';
import type Konva from 'konva';
import { useShallow } from 'zustand/react/shallow';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image,
  Italic,
  type LucideIcon,
  PlusSquare,
  Save,
  Type,
  Underline,
  Video,
} from 'lucide-react';

import styles from './KonvaToolbar.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import {
  CustomKonvaAttributes,
  defaultElementAttributes,
  waitUntilKonvaNodeSizeIsCalculated,
} from '@/utils/konva';
import type {
  CanvasElement,
  CanvasElementOfType,
  KonvaNodeAndElement,
} from '@/utils/types';

import { Tooltip, TooltipProvider } from '@/components/Tooltip';
import { AddAssetElementDialog } from './AddAssetElementDialog';
import { TextSizesPopover } from './TextSizesPopover';

const mediumIconSize = 18;
const smallIconSize = 14;
const popoverOffset = 12;
const tooltipOffset = 4;

export function KonvaToolbar() {
  const { selection } = useTransformerSelectionStore();
  const canvasElement = useCanvasTreeStore(
    useShallow((state) => {
      if (selection === undefined || Array.isArray(selection)) return undefined;

      return state.canvasTree.find(
        (element) => element.id === selection.node.id()
      );
    })
  );

  return (
    <TooltipProvider>
      <Toolbar.Root className={styles.toolbar} orientation="vertical">
        <AddElementButton />

        <Toolbar.Separator className={styles.toolbarSeparator} />

        {/* TEXT */}
        {!Array.isArray(selection) &&
          selection?.type === 'text' &&
          canvasElement?.type === 'text' && (
            <>
              <TextSizesButton
                node={selection.node}
                canvasElement={canvasElement}
              />
              <TextAlignmentButton
                node={selection.node}
                canvasElement={canvasElement}
              />

              <Toolbar.Separator className={styles.toolbarSeparator} />

              <TextFormattingToggleGroup
                node={selection.node}
                canvasElement={canvasElement}
              />
            </>
          )}

        {selection &&
          !Array.isArray(selection) &&
          selection?.type === 'text' && (
            <Toolbar.Separator className={styles.toolbarSeparator} />
          )}

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
    attrs?: Omit<CanvasElementOfType<T>, 'id' | 'type'>
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

function TextSizesButton({ node, canvasElement }: KonvaNodeAndElement<'text'>) {
  return (
    <Popover.Root>
      <Tooltip content="Text sizes" side="right" sideOffset={tooltipOffset}>
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <Type size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <TextSizesPopover
        node={node}
        canvasElement={canvasElement}
        popoverOffset={popoverOffset}
      />
    </Popover.Root>
  );
}

const textAlignmentsMap = {
  left: { label: 'Left aligned', Icon: AlignLeft },
  center: { label: 'Center aligned', Icon: AlignCenter },
  right: { label: 'Right aligned', Icon: AlignRight },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

function TextAlignmentButton({
  node,
  canvasElement,
}: KonvaNodeAndElement<'text'>) {
  const textAlignmentLabel = 'Text alignment';

  const currentTextAlignment = (canvasElement.align ||
    defaultElementAttributes.text.align) as keyof typeof textAlignmentsMap;
  const CurrentTextAlignmentIcon = textAlignmentsMap[currentTextAlignment].Icon;

  function handleChangeTextAlignment(newTextAlignment: string) {
    // Set text alignment
    node.align(newTextAlignment);
    // Save the new text alignment
    canvasElement.saveAttrs({ align: newTextAlignment });
  }

  return (
    <Popover.Root>
      <Tooltip
        content={textAlignmentLabel}
        side="right"
        sideOffset={tooltipOffset}
      >
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <CurrentTextAlignmentIcon size={mediumIconSize} />
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
            defaultValue={currentTextAlignment}
            loop={false}
            aria-label={textAlignmentLabel}
            onValueChange={handleChangeTextAlignment}
          >
            {Object.entries(textAlignmentsMap).map(
              ([alignment, { Icon, label }]) => (
                <RadioGroup.Item
                  key={alignment}
                  className={styles.toolbarButton}
                  value={alignment}
                  aria-label={label}
                  data-icon-only
                  autoFocus={alignment === currentTextAlignment}
                >
                  <Icon size={mediumIconSize} />
                </RadioGroup.Item>
              )
            )}
          </RadioGroup.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const textFormattingMap = {
  bold: { label: 'Bold', Icon: Bold },
  italic: { label: 'Italic', Icon: Italic },
  underline: { label: 'Underline', Icon: Underline },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

function TextFormattingToggleGroup({
  node,
  canvasElement,
}: KonvaNodeAndElement<'text'>) {
  /* This is just the initial value of the text formatting, so it's using
  `useMemo` with an empty dependency array to just compute it once */
  const initialTextFormatting = useMemo(
    () => {
      const textFormatting = [];
      // Get the saved font style
      if (canvasElement.fontStyle) {
        // `fontStyle` is a string of space separated values (e.g. 'italic bold')
        canvasElement.fontStyle
          .split(' ')
          .forEach((style) => textFormatting.push(style));
      }
      // Get the saved text decoration
      if (canvasElement.textDecoration) {
        textFormatting.push(canvasElement.textDecoration);
      }

      return textFormatting;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function handleChangeTextFormatting(value: string[]) {
    // Set font style
    const fontStyleArray: string[] = [];
    if (value.includes('italic')) fontStyleArray.push('italic');
    if (value.includes('bold')) fontStyleArray.push('bold');
    node.fontStyle(fontStyleArray.join(' '));

    // Set text decoration
    const textDecoration = value.includes('underline') ? 'underline' : '';
    node.textDecoration(textDecoration);

    // Save the new text formatting
    canvasElement.saveAttrs({
      fontStyle: node.fontStyle(),
      textDecoration: node.textDecoration(),
    });
  }

  return (
    <Toolbar.ToggleGroup
      className={styles.toggleGroup}
      type="multiple"
      orientation="vertical"
      defaultValue={initialTextFormatting}
      aria-label="Text formatting"
      onValueChange={handleChangeTextFormatting}
    >
      {Object.entries(textFormattingMap).map(
        ([formatting, { label, Icon }]) => (
          <Tooltip
            key={formatting}
            content={label}
            side="right"
            sideOffset={tooltipOffset}
          >
            <Toolbar.ToggleItem
              className={styles.toolbarButton}
              value={formatting}
              data-icon-only
            >
              <Icon size={mediumIconSize} />
            </Toolbar.ToggleItem>
          </Tooltip>
        )
      )}
    </Toolbar.ToggleGroup>
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
