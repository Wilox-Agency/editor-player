import { type } from 'arktype';

import type {
  AssignableOrNever,
  CreateObjectWithNestedProperties,
  PathsToFields,
  StringSplit,
} from '@/utils/types';

/**
 * Checks if the an object property has a certain value.
 * @param object The object which may contain the property to be checked.
 * @param propertyPath The path to the property to be checked as a string
 * @param propertyValue The desired value of the property, which will be
 * compared with the actual value of in the object.
 * @returns A boolean that tells if the the property has the desired value.
 */
export function checkProperty<
  const TObj extends object,
  const TPropPath extends PathsToFields<TObj>,
  const TPropValue,
  TPropArray extends string[] = StringSplit<TPropPath, '.'>,
  TResult = AssignableOrNever<
    TObj,
    CreateObjectWithNestedProperties<TPropArray, TPropValue>
  >
>(
  object: TObj,
  propertyPath: TPropPath,
  propertyValue: TPropValue
  // @ts-expect-error The TS server cannot tell that `TResult` will always
  // extend `TObj` before actually computing the result, so it shows an error
): object is TResult {
  const properties = propertyPath.split('.') as TPropArray;

  let current: unknown = object;
  for (const property of properties) {
    if (
      typeof current !== 'object' ||
      current === null ||
      !(property in current)
    ) {
      return false;
    }

    current = current[property as keyof typeof current];
  }

  return current === propertyValue;
}

export function validateUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}

export function validateAssetUrl(type: 'image' | 'video', url: string) {
  return new Promise<boolean>((resolve) => {
    const element = document.createElement(type === 'image' ? 'img' : 'video');
    const loadEventName = type === 'image' ? 'load' : 'loadedmetadata';

    function handleLoad() {
      resolve(true);
      cleanup();
    }

    function handleError() {
      resolve(false);
      cleanup();
    }

    function cleanup() {
      element.removeEventListener(loadEventName, handleLoad);
      element.removeEventListener('error', handleError);
      element.remove();
    }

    element.addEventListener(loadEventName, handleLoad);
    element.addEventListener('error', handleError);
    element.src = url;
  });
}

export const TextSizes = {
  minFontSize: 12,
  minLineHeight: 1,
  maxLineHeight: 2,
  minLetterSpacing: -5,
  maxLetterSpacing: 150,
} as const;

export const validateFontSize = type(`number>=${TextSizes.minFontSize}`);

export const validateLineHeight = type(
  `${TextSizes.minLineHeight}<=number<=${TextSizes.maxLineHeight}`
);

export const validateLetterSpacing = type(
  `${TextSizes.minLetterSpacing}<=number<=${TextSizes.maxLetterSpacing}`
);
