import { useEffect, useMemo, useState } from 'react';
import type Konva from 'konva';
import { useShallow } from 'zustand/react/shallow';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { type Color, parseColor } from '@react-stately/color';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image,
  Italic,
  type LucideIcon,
  Paintbrush,
  PaintBucket,
  PlusSquare,
  Radius,
  Save,
  Square,
  Type,
  Underline,
  Video,
} from 'lucide-react';

import styles from './KonvaToolbar.module.css';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useCanvasStyleStore } from '@/hooks/useCanvasStyleStore';
import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import {
  defaultElementAttributes,
  saveCanvas,
  StageVirtualSize,
  waitUntilKonvaNodeSizeIsCalculated,
} from '@/utils/konva';
import type {
  CanvasElement,
  CanvasElementOfType,
  KonvaNodeAndElement,
} from '@/utils/types';

import { Tooltip, TooltipProvider } from '@/components/Tooltip';
import { ColorPicker } from '@/components/ColorPicker';
import { Slider } from '@/components/Slider';
import { AddAssetElementDialog } from './AddAssetElementDialog';
import { TextSizesPopover } from './TextSizesPopover';

const mediumIconSize = 18;
const smallIconSize = 14;
const popoverOffset = 12;
const tooltipOffset = 4;

export function KonvaToolbar() {
  const selection = useTransformerSelectionStore((state) => state.selection);
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
        <ChangeBackgroundColorButton />

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
              <TextColorButton
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

        {/* RECT */}
        {!Array.isArray(selection) &&
          selection?.type === 'rect' &&
          canvasElement?.type === 'rect' && (
            <>
              <RectColorButton
                node={selection.node}
                canvasElement={canvasElement}
              />
              <RectCornerRadiusButton
                node={selection.node}
                canvasElement={canvasElement}
              />
            </>
          )}

        {selection &&
          !Array.isArray(selection) &&
          (selection.type === 'text' || selection.type === 'rect') && (
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

      const node = layerRef.current?.findOne(`#${idOfNewlyCreatedElement}`);
      if (!node) return;

      // Hide the node before centering and selecting it
      node.visible(false);

      // Wait until the node size is calculated
      await waitUntilKonvaNodeSizeIsCalculated(node);

      const isNodeOverflowingCanvas =
        node.width() > StageVirtualSize.width ||
        node.height() > StageVirtualSize.height;
      // Reduce node size if it overflows the canvas
      if (isNodeOverflowingCanvas) {
        const stageAspectRatio =
          StageVirtualSize.width / StageVirtualSize.height;
        const nodeAspectRatio = node.width() / node.height();

        if (nodeAspectRatio >= stageAspectRatio) {
          const scale = StageVirtualSize.width / node.width();
          node.size({
            width: StageVirtualSize.width,
            height: node.height() * scale,
          });
        } else {
          const scale = StageVirtualSize.height / node.height();
          node.size({
            width: node.width() * scale,
            height: StageVirtualSize.height,
          });
        }
        // Saving the new size and position
        updateElement(idOfNewlyCreatedElement, {
          ...node.position(),
          ...node.size(),
        });
      }

      // Center the node and save its new position
      node.position({
        x: StageVirtualSize.width / 2 - node.width() / 2,
        y: StageVirtualSize.height / 2 - node.height() / 2,
      });
      updateElement(idOfNewlyCreatedElement, node.position());

      // Show the node
      node.visible(true);

      // Select the node
      selectNodes([node]);
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

          <button
            className={styles.toolbarButton}
            onClick={() => handleAddElement('rect')}
          >
            <Square size={smallIconSize} /> Rectangle
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ChangeBackgroundColorButton() {
  const canvasBackgroundColor = useCanvasStyleStore(
    (state) => state.canvasBackgroundColor
  );
  const changeCanvasBackgroundColor = useCanvasStyleStore(
    (state) => state.changeCanvasBackgroundColor
  );

  return (
    <Popover.Root>
      <Tooltip
        content="Change background"
        side="right"
        sideOffset={tooltipOffset}
      >
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <PaintBucket size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          side="right"
          sideOffset={popoverOffset}
          data-padding="medium"
        >
          <ColorPicker
            color={canvasBackgroundColor}
            onColorChange={changeCanvasBackgroundColor}
          />
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

function TextColorButton({ node, canvasElement }: KonvaNodeAndElement<'text'>) {
  const [color, setColor] = useState(() => {
    // Set the initial state as the current color of the text
    return parseColor(node.fill()).toFormat('hsb');
  });

  function handleColorChange(color: Color) {
    // Update the state
    setColor(color);

    // Set and save the new text color
    const cssColor = color.toString('css');
    node.fill(cssColor);
    canvasElement.saveAttrs({ fill: cssColor });
  }

  return (
    <Popover.Root>
      <Tooltip content="Text color" side="right" sideOffset={tooltipOffset}>
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <Paintbrush size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          side="right"
          sideOffset={popoverOffset}
          data-padding="medium"
        >
          <ColorPicker color={color} onColorChange={handleColorChange} />
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

function RectColorButton({ node, canvasElement }: KonvaNodeAndElement<'rect'>) {
  const [color, setColor] = useState(() => {
    // Set the initial state as the current color of the rect
    return parseColor(node.fill()).toFormat('hsb');
  });

  function handleColorChange(color: Color) {
    // Update the state
    setColor(color);

    // Set and save the new rect color
    const cssColor = color.toString('css');
    node.fill(cssColor);
    canvasElement.saveAttrs({ fill: cssColor });
  }

  return (
    <Popover.Root>
      <Tooltip
        content="Rectangle color"
        side="right"
        sideOffset={tooltipOffset}
      >
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <Paintbrush size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          side="right"
          sideOffset={popoverOffset}
          data-padding="medium"
        >
          <ColorPicker color={color} onColorChange={handleColorChange} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function RectCornerRadiusButton({
  node,
  canvasElement,
}: KonvaNodeAndElement<'rect'>) {
  /* Asserting the corner radius as a number because there's no way to modify it
  as an array */
  const currentCornerRadius = (canvasElement.cornerRadius ||
    node.cornerRadius()) as number;
  // The maximum corner radius is half of the smallest side
  const maxCornerRadius = Math.ceil(
    Math.min(
      canvasElement.width || defaultElementAttributes.rect.width,
      canvasElement.height || defaultElementAttributes.rect.height
    ) / 2
  );

  function handleChangeCornerRadius(cornerRadius: number) {
    if (cornerRadius === undefined) return;

    node.cornerRadius(Math.min(cornerRadius, maxCornerRadius));
    canvasElement.saveAttrs({ cornerRadius: node.cornerRadius() });
  }

  return (
    <Popover.Root>
      <Tooltip content="Corner radius" side="right" sideOffset={tooltipOffset}>
        <Popover.Trigger asChild>
          <Toolbar.Button className={styles.toolbarButton} data-icon-only>
            <Radius size={mediumIconSize} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          side="right"
          sideOffset={popoverOffset}
          data-padding="medium"
        >
          <Slider
            label="Corner radius"
            defaultValue={currentCornerRadius}
            minValue={0}
            maxValue={maxCornerRadius}
            step={1}
            onChange={handleChangeCornerRadius}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SaveButton() {
  return (
    <Tooltip content="Save" side="right" sideOffset={tooltipOffset}>
      <Toolbar.Button
        className={styles.toolbarButton}
        onClick={saveCanvas}
        data-icon-only
      >
        <Save size={mediumIconSize} />
      </Toolbar.Button>
    </Tooltip>
  );
}
