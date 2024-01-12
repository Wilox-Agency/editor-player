import type { KonvaNodeComponent, KonvaNodeEvents } from 'react-konva';

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
