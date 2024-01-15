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
  xWithinImage: number;
  yWithinImage: number;
  width: number;
  height: number;
};

export type CanvasElement = (
  | (ImageProps & { type: 'image' })
  | (VideoProps & { type: 'video' })
  | (TextProps & { type: 'text' })
) & {
  elementId: string;
};
