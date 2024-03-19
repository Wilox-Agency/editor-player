import { useStageScaleStore } from '@/hooks/useStageScaleStore';
import type { Prettify } from '@/utils/types';

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
