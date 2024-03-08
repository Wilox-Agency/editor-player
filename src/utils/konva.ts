import type { ElementType } from 'react';
import type Konva from 'konva';
import { toast } from 'sonner';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { useCanvasStyleStore } from '@/hooks/useCanvasStyleStore';
import { useStageScaleStore } from '@/hooks/useStageScaleStore';
import type {
  CanvasElement,
  CanvasElementOfType,
  Prettify,
} from '@/utils/types';

import { Image, Video } from '@/components/konva/Image';
import { Text } from '@/components/konva/Text';
import { Rect } from '@/components/konva/Rect';

/* The virtual size of the stage will be 1920x1080px, but the real size will be
different to fit the user's page */
export const StageVirtualSize = { width: 1920, height: 1080 } as const;

export const CanvasComponentByType = {
  video: Video,
  image: Image,
  text: Text,
  rect: Rect,
} as const satisfies Record<CanvasElement['type'], ElementType>;

export const CustomKonvaAttributes = {
  unselectable: '_unselectable',
} as const;

export const defaultElementAttributes = {
  video: {
    draggable: true,
  },
  image: {
    draggable: true,
  },
  text: {
    text: 'Text',
    fill: 'rgb(255,255,255)',
    fontSize: 32,
    lineHeight: 1,
    letterSpacing: 0,
    align: 'center',
    draggable: true,
  },
  rect: {
    width: 100,
    height: 100,
    fill: 'rgb(255,255,255)',
    draggable: true,
  },
} as const satisfies {
  [K in CanvasElement['type']]: Partial<
    Omit<CanvasElementOfType<K>, 'id' | 'type'>
  >;
};

/**
 * When creating a Konva node, the size at which it will appear on the screen
 * might take a few milliseconds to calculate. This function checks the size of
 * the provided node until it is calculated (i.e. it is different from
 * `undefined` and from `0`) and then returns it.
 *
 * This function throws if the size is not calculated after 1s.
 */
export function waitUntilKonvaNodeSizeIsCalculated(
  node: Konva.Node,
  delayInMilliseconds: number = 50
) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const startTime = new Date().getTime();
    const maxWaitTime = 1000; // 1s

    function checkSize() {
      const currentTime = new Date().getTime();
      const timeElapsed = currentTime - startTime;
      // Rejecting after exceeding the maximum wait time
      if (timeElapsed >= maxWaitTime) {
        reject(new Error('Timeout'));
        return;
      }

      // Width and height can be `undefined` or `0`
      if (!node.width() || !node.height()) {
        setTimeout(() => {
          checkSize();
        }, delayInMilliseconds);
        return;
      }

      resolve({ width: node.width(), height: node.height() });
    }

    setTimeout(() => {
      checkSize();
    });
  });
}

type ScaleType = 'scaled' | 'unscaled';

export function convertScale(number: number, { to }: { to: ScaleType }): number;
export function convertScale<
  TType,
  /* Mapping through `TType` (using the `Prettify` helper) to convert it from an
  interface to an object (if it is an interface) */
  TTypeAsObject extends Record<PropertyKey, unknown> = Prettify<TType>,
  TKey extends keyof TTypeAsObject = keyof TTypeAsObject
>(
  object: TType,
  { to, ignoreKeys }: { to: ScaleType; ignoreKeys?: TKey[] }
): /* When the type of a generic is not assignable to the value the generic
extends from, the type of the generic will be exactly the type it extends from,
therefore if `TTypeAsObject` is equal to `Record<PropertyKey, unknown>` (the
type it extends from), it means `TType` is not an object, so return `unknown`. */
Record<PropertyKey, unknown> extends TTypeAsObject ? unknown : TType;
/**
 * This function can be used to get an unscaled equivalent of a scaled number or
 * set of numbers and vice-versa.
 *
 * This is useful because some values in Konva are relative to the actual size
 * of the canvas (i.e. are scaled) rather than relative to the virtual size of
 * the canvas (i.e. rather than unscaled, as almost everything else is). An
 * example is the parameters of any "bound" function (e.g. `dragBoundFunc`
 * attribute of a node and `boundBoxFunc` attribute of a transformer).
 */
export function convertScale<TType, TKey extends keyof TType = keyof TType>(
  numberOrObject: TType,
  { to, ignoreKeys }: { to: ScaleType; ignoreKeys?: TKey[] }
): TType | number {
  const stageCanvasScale = useStageScaleStore.getState().stageCanvasScale;

  /**
   * Multiplies the value by the scale when scaling or divides the value by the
   * scale when unscaling.
   */
  function convert(value: number) {
    if (to === 'scaled') return value * stageCanvasScale;
    return value / stageCanvasScale;
  }

  if (typeof numberOrObject === 'number') {
    return convert(numberOrObject);
  }

  const shallowCopy = { ...numberOrObject };
  for (const key in shallowCopy) {
    // Skip iteration when key is ignored or value is not number
    const isIgnoredKey = (ignoreKeys as string[] | undefined)?.includes(key);
    const isNumber = typeof shallowCopy[key] === 'number';
    if (isIgnoredKey || !isNumber) continue;

    (shallowCopy[key] as number) = convert(shallowCopy[key] as number);
  }
  return shallowCopy;
}

export function getCanvasImageIntrinsicSize(imageSource: CanvasImageSource): {
  width: number;
  height: number;
} {
  if (imageSource instanceof HTMLImageElement) {
    return {
      width: imageSource.naturalWidth,
      height: imageSource.naturalHeight,
    };
  }

  if (imageSource instanceof SVGImageElement) {
    return {
      width: imageSource.width.baseVal.value,
      height: imageSource.height.baseVal.value,
    };
  }

  if (imageSource instanceof HTMLVideoElement) {
    return { width: imageSource.videoWidth, height: imageSource.videoHeight };
  }

  if (imageSource instanceof VideoFrame) {
    return {
      width: imageSource.displayWidth,
      height: imageSource.displayHeight,
    };
  }

  return { width: imageSource.width, height: imageSource.height };
}

export function saveCanvas() {
  const canvasTreeAsString = JSON.stringify(
    useCanvasTreeStore.getState().canvasTree
  );
  const canvasStyleAsString = JSON.stringify(
    useCanvasStyleStore.getState().canvasStyleToJson()
  );

  localStorage.setItem('@sophia-slide-editor:canvas-tree', canvasTreeAsString);
  localStorage.setItem(
    '@sophia-slide-editor:canvas-style',
    canvasStyleAsString
  );

  toast.success('Canvas saved successfully!');
}

/**
 * Gets the minimum text node width for the current text format (i.e. without
 * creating any new lines or changing the position of any word). Optionally pass
 * different text attributes to get the minimum width for a text with different
 * attributes than the current one.
 */
export function getMinTextNodeWidthForCurrentTextFormat(
  textNode: Konva.Text,
  {
    fontFamily = textNode.fontFamily(),
    fontSize = textNode.fontSize(),
    letterSpacing = textNode.letterSpacing(),
    fontStyle = textNode.fontStyle(),
  } = {}
) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
  ctx.letterSpacing = `${letterSpacing}px`;

  const minWidth = Math.max(
    ...textNode.textArr.map((textLine) => ctx.measureText(textLine.text).width)
  );

  canvas.remove();

  return minWidth;
}

/**
 * Gets the minimum `textarea` width for the current format of a text node (i.e.
 * without creating any new lines or changing the position of any word).
 * Optionally pass different text node attributes to get the minimum width for a
 * text node with different attributes than the given one.
 */
export function getMinTextAreaWidthForCurrentTextFormat(
  textNode: Konva.Text,
  {
    fontFamily = textNode.fontFamily(),
    fontSize = textNode.fontSize(),
    letterSpacing = textNode.letterSpacing(),
    fontStyle = textNode.fontStyle(),
  } = {}
) {
  const textElement = document.createElement('p');

  // Reset all styles
  textElement.style.all = 'unset';
  // Make it inaccessible
  textElement.setAttribute('aria-hidden', 'true');
  // Prevent it from affecting the layout and vice-versa
  textElement.style.position = 'absolute';
  // Make it invisible
  textElement.style.opacity = '0';
  textElement.style.clipPath = 'rect(0, 0, 0, 0)';

  // Set the styles used by the text node
  textElement.style.fontFamily = fontFamily;
  textElement.style.fontSize = `${fontSize}px`;
  if (fontStyle.includes('bold')) {
    textElement.style.fontWeight = 'bold';
  }
  if (fontStyle.includes('italic')) {
    textElement.style.fontStyle = 'italic';
  }
  textElement.style.letterSpacing + `${letterSpacing}px`;

  // Get the text width then remove the element
  document.body.append(textElement);
  const minWidth = Math.max(
    ...textNode.textArr.map((textLine) => {
      textElement.innerText = textLine.text;
      return textElement.getBoundingClientRect().width;
    })
  );
  textElement.remove();

  return minWidth;
}

/**
 * Gets the multiplier of how much the text width will change when changing some
 * of the attributes of a given text node.
 */
export function getTextWidthChangeMultiplier(
  textNode: Konva.Text,
  {
    fontFamily = textNode.fontFamily(),
    fontSize = textNode.fontSize(),
    letterSpacing = textNode.letterSpacing(),
    fontStyle = textNode.fontStyle(),
  }
) {
  const currentMinTextWidth = getMinTextNodeWidthForCurrentTextFormat(textNode);
  const newMinTextWidth = getMinTextNodeWidthForCurrentTextFormat(textNode, {
    fontSize,
    letterSpacing,
    fontStyle,
    fontFamily,
  });

  return newMinTextWidth / currentMinTextWidth;
}

/**
 * Returns a boolean that tells if a given text node is using automatic width
 * (which makes the width fit the text).
 */
export function getIsAutoTextWidth(textNode: Konva.Text) {
  return textNode.attrs.width === undefined || textNode.attrs.width === 'auto';
}
