import { type } from 'arktype';

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
