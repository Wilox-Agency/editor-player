import type Konva from 'konva';
import type { KonvaNodeComponent, KonvaNodeEvents } from 'react-konva';
import type { IsNever, OptionalKeysOf, RequiredKeysOf } from 'type-fest';

import type { ImageProps, VideoProps } from '@/components/konva/Image';
import type { TextProps } from '@/components/konva/Text';
import type { RectProps } from '@/components/konva/Rect';

/**
 * Computes a type to make it more readable.
 * @see https://www.totaltypescript.com/concepts/the-prettify-helper
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

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

/**
 * `keyof` alternative that works with unions
 *
 * @example
 * type Union = { foo: string } | { bar: string };
 *
 * type A = keyof Union;
 * //   ^? type A = never
 * type B = DistributiveKeyOf<Union>;
 * //   ^? type B = "foo" | "bar"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveKeyOf<T> = T extends any ? keyof T : never;

export type AddMissingKeysAsOptionalUndefined<
  TObj,
  TKeys extends PropertyKey
> = Prettify<TObj & { [TKey in Exclude<TKeys, keyof TObj>]?: undefined }>;

/**
 * Sets all the properties of an object to optional and `undefined`.
 *
 * @example
 * type A = UndefinedProperites<{ foo: string }>;
 * // is equivalent to
 * type B = { foo?: undefined };
 */
export type UndefinedProperites<T> = { [K in keyof T]?: undefined };

/**
 * Turns a union into an intersection.
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
export type UnionToIntersection<U> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoInfer<T> = [T][T extends any ? 0 : never];

/** @see https://stackoverflow.com/questions/70831365/can-i-slice-literal-type-in-typescript */
export type StringSplit<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...StringSplit<U, D>]
  : [S];

export type AccessPropertyFromString<
  TValue,
  TPropertiesArray extends string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = TValue extends any
  ? TPropertiesArray extends [infer TProperty, ...infer TTail]
    ? TProperty extends keyof TValue
      ? TTail extends string[]
        ? AccessPropertyFromString<TValue[TProperty], TTail>
        : never
      : never
    : TValue
  : never;

type StringOrNever<T> = T extends string ? T : never;

export type CreateObjectWithNestedProperties<
  TPropertiesArray extends string[],
  TValueOfMostNestedProperty
> = TPropertiesArray extends [infer TProperty]
  ? { [K in StringOrNever<TProperty>]: TValueOfMostNestedProperty }
  : TPropertiesArray extends [infer TProperty, ...infer TRest]
  ? TRest extends string[]
    ? {
        [K in StringOrNever<TProperty>]: CreateObjectWithNestedProperties<
          TRest,
          TValueOfMostNestedProperty
        >;
      }
    : never
  : never;

declare const neverSymbol: unique symbol;
type NeverSymbol = typeof neverSymbol;

type AllOrNothingNeverInner<T> = IsNever<T> extends true
  ? NeverSymbol
  : T extends object
  ? { [K in keyof T]: AllOrNothingNeverInner<T[K]> }[keyof T]
  : T;

type AllOrNothingNever<T> = NeverSymbol extends AllOrNothingNeverInner<T>
  ? never
  : T;

type AssignableOrNeverCommonKeys<
  TObj,
  TObjAssign,
  TKey extends keyof TObj
> = TKey extends keyof TObjAssign
  ? NonNullable<TObjAssign[TKey]> extends object
    ? NonNullable<TObj[TKey]> extends object
      ? AssignableOrNever<
          NonNullable<TObj[TKey]>,
          NonNullable<TObjAssign[TKey]>
        >
      : never // Type is not assignable
    : // If at least one of properties is not an object, check assignability directly
    TObjAssign[TKey] extends TObj[TKey]
    ? TObjAssign[TKey]
    : never // Type is not assignable
  : TObj[TKey];

export type AssignableOrNever<
  TObj extends object,
  TObjAssign extends object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = TObj extends any
  ? keyof TObjAssign extends keyof TObj
    ? AllOrNothingNever<
        Prettify<
          {
            // All required keys that are exclusive to TObj
            [TKey in Exclude<
              RequiredKeysOf<TObj>,
              keyof TObjAssign
            >]: TObj[TKey];
          } & {
            // All optional keys that are exclusive to TObj
            [TKey in Exclude<
              OptionalKeysOf<TObj>,
              keyof TObjAssign
            >]?: TObj[TKey];
          } & {
            // All common keys that are required in TObjAssign
            [TKey in Extract<
              keyof TObj,
              RequiredKeysOf<TObjAssign>
            >]: AssignableOrNeverCommonKeys<TObj, TObjAssign, TKey>;
          } & {
            // All common keys that are optional in TObjAssign
            [TKey in Extract<
              keyof TObj,
              OptionalKeysOf<TObjAssign>
            >]?: TKey extends OptionalKeysOf<TObj>
              ? AssignableOrNeverCommonKeys<TObj, TObjAssign, TKey>
              : never; // Property is optional in `TObjAssign` but not in `TObj`
          }
        >
      >
    : never
  : never;

type Dot<T extends string, U extends string> = '' extends U ? T : `${T}.${U}`;
type StopFields = string | number | boolean | symbol;
/** @see https://stackoverflow.com/questions/76384345/how-to-implement-a-typescript-generic-type-for-nested-properties-that-resolves-t */
export type PathsToFields<T> = T extends StopFields
  ? ''
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends any[]
  ? '' // Prevent showing any array methods
  : {
      [K in Extract<keyof T, string>]: K | Dot<K, PathsToFields<T[K]>>;
    }[Extract<keyof T, string>];

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
    | (RectProps & { type: 'rect' })
  ) & { id: string },
  'saveAttrs' | 'remove'
>;

export type CanvasElementAttribute = DistributiveKeyOf<CanvasElement>;

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
  rect: Konva.Rect;
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

/**
 * Works like a union but sets the keys that don't exist in one of the sides of
 * the union but exist in the other as optional and `undefined` instead of
 * non-existent.
 *
 * This type is called `JsUnion` because, as in JavaScript, when accessing a
 * property that doesn't exist in an object, it doesn't throw an error, it will
 * just have a value of `undefined`.
 *
 * @example
 * type A = JsUnion<{ foo: string }, { bar: string }>;
 * // is equivalent to
 * type B = { foo: string; bar?: undefined } | { bar: string; foo?: undefined };
 *
 * @see https://github.com/microsoft/TypeScript/issues/42775
 */
export type JsUnion<A, B> =
  | (A & UndefinedProperites<Omit<B, keyof A>>)
  | (B & UndefinedProperites<Omit<A, keyof B>>);

export type Slide<TElement = CanvasElement> = {
  canvasElements: TElement[];
  duration: number;
};

export type SlideWithAudio<TElement = CanvasElement> = Slide<TElement> & {
  audio?: { url: string; start?: number };
};

export type SlideWithAudioAndStartTime<TElement = CanvasElement> =
  SlideWithAudio<TElement> & {
    startTime: number;
  };
