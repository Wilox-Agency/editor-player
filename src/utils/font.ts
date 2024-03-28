import FontFaceObserver from 'fontfaceobserver';
import { toast } from 'sonner';

import type { CanvasElement } from '@/utils/types';

export function observeFontsLoadingFromCanvasElements(
  canvasElements: CanvasElement[]
) {
  const fontFamilies = new Set<string>();

  for (const element of canvasElements) {
    if (element.type !== 'text') continue;
    /* If the text has no font family defined, it is using Arial, which is the
    default font */
    fontFamilies.add(element.fontFamily || 'Arial');
  }

  const loadFontPromises = Array.from(fontFamilies).map((fontFamily) => {
    /* There's no actual benefit of checking if the already font loaded using
    `FontFaceSet.check` instead of just using the font face observer, but
    observing local fonts (e.g. Arial) will always throw an error, which is a
    false-positive. That's why `FontFaceSet.check` is necessary. */
    /* `FontFaceSet.check` requires a font size, but it doesn't matter what font
    size is used. */
    const didFontAlreadyLoad = document.fonts.check(`16px ${fontFamily}`);
    if (didFontAlreadyLoad) {
      return new Promise<void>((resolve) => resolve());
    }
    return new FontFaceObserver(fontFamily).load();
  });
  const loadFontsPromise = Promise.allSettled(loadFontPromises);

  toast.promise(loadFontsPromise, {
    loading: 'Loading fonts...',
    success: (results) => {
      const numberOfSuccesses = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const totalOfResults = results.length;

      if (numberOfSuccesses === totalOfResults) {
        return 'All fonts loaded successfully!';
      }
      return `${numberOfSuccesses} fonts loaded out of ${totalOfResults}.`;
    },
    error: 'Could not load fonts.',
  });
}
