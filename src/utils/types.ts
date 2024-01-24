import type Konva from 'konva';
import type { KonvaNodeComponent, KonvaNodeEvents } from 'react-konva';

import type { ImageProps, VideoProps } from '@/components/konva/Image';
import type { TextProps } from '@/components/konva/Text';

/**
 * Removes the index signature of an object type.
 * @see https://stackoverflow.com/questions/51465182/how-to-remove-index-signature-using-mapped-types
 */
export type RemoveIndex<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K]: T[K];
};

/**
 * `Omit` alternative that preserves unions
 * @see https://github.com/microsoft/TypeScript/issues/54525
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, TOmitted extends PropertyKey> = T extends any
  ? Omit<T, TOmitted>
  : never;

export type KonvaComponentProps<T> = T extends KonvaNodeComponent<
  infer _TNode,
  infer TProps
>
  ? RemoveIndex<TProps> & KonvaNodeEvents
  : never;

export type UncroppedImageRect = {
  /**
   * The distance (in the **horizontal** axis) between the uncropped image `x`
   * and the cropped image `x`. Note that the `x` of the `crop` attribute (from
   * `Konva.Image`) represents the same thing BUT as if the image was in its
   * original size.
   */
  cropXWithScale: number;
  /**
   * The distance (in the **vertical** axis) between the uncropped image `y` and
   * the cropped image `y`. Note that the `y` of the `crop` attribute (from
   * `Konva.Image`) represents the same thing BUT as if the image was in its
   * original size.
   */
  cropYWithScale: number;
  width: number;
  height: number;
};

export type CanvasElement = DistributiveOmit<
  (
    | (ImageProps & { type: 'image' })
    | (VideoProps & { type: 'video' })
    | (TextProps & { type: 'text' })
  ) & { id: string },
  'saveAttrs' | 'remove'
>;

export type CanvasElementWithActions<
  TElement extends CanvasElement = CanvasElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = TElement extends any
  ? TElement & {
      saveAttrs: (
        attributes: Partial<Omit<TElement, 'elementId' | 'type'>>
      ) => void;
      remove: () => void;
    }
  : never;

export type CanvasElementOfType<TType extends CanvasElement['type']> = Extract<
  CanvasElement,
  { type: TType }
>;

export type CanvasElementOfTypeWithActions<
  TType extends CanvasElement['type']
> = Extract<CanvasElementWithActions, { type: TType }>;

type KonvaNodeByElementType = {
  video: Konva.Image;
  image: Konva.Image;
  text: Konva.Text;
};

export type KonvaNodeWithType<
  T extends CanvasElement['type'] = CanvasElement['type']
> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends any
    ? {
        type: T;
        node: KonvaNodeByElementType[T];
      }
    : never;

export type KonvaNodeAndElement<
  TType extends CanvasElement['type'] = CanvasElement['type'],
  TElement extends CanvasElementWithActions = Extract<
    CanvasElementWithActions,
    { type: TType }
  >
> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TType extends any
    ? {
        canvasElement: TElement;
        node: KonvaNodeByElementType[TType];
      }
    : never;
