import FontFaceObserver from 'fontfaceobserver';
import { toast } from 'sonner';

export const FontFamily = {
  Arial: 'Arial',
  Oswald: 'Oswald',
  Roboto: 'Roboto',
} as const;

export const fontFamilies = Object.values(FontFamily);

async function waitUntilFontLoads(fontFamily: string | undefined) {
  // Konva uses Arial as default font family
  fontFamily ||= FontFamily.Arial;

  /* There's no actual benefit of checking if the already font loaded using
  `FontFaceSet.check` instead of just using the font face observer, but
  observing local fonts (e.g. Arial) will always throw an error, which is a
  false-positive. That's why `FontFaceSet.check` is necessary. */
  /* `FontFaceSet.check` requires a font size, but it doesn't matter what font
  size is used. */
  const didFontAlreadyLoad = document.fonts.check(`16px ${fontFamily}`);
  if (didFontAlreadyLoad) return;

  const fontLoadPromise = new FontFaceObserver(fontFamily).load();

  let warningToastId: string | number | undefined;
  // Show a toast if the font doesn't load after 10 seconds
  const timeout = setTimeout(() => {
    warningToastId = toast.warning(
      `The font "${fontFamily}" is taking too long to load. Consider reloading the page.`
    );
  }, 10_000 /* 10 seconds */);

  await fontLoadPromise;

  // Clear the timeout after the font is loaded
  clearTimeout(timeout);
  // Dismiss the toast if it was already shown
  if (warningToastId !== undefined) {
    /* Even though `toast.dismiss` can receive undefined, it should not be
    called with undefined as it would dismiss all toasts. */
    toast.dismiss(warningToastId);
  }
}

export async function waitUntilAllSupportedFontsLoad() {
  const fontLoadPromises = fontFamilies.map((fontFamily) => {
    return waitUntilFontLoads(fontFamily);
  });
  const fontsLoadPromise = Promise.allSettled(fontLoadPromises);

  toast.promise(fontsLoadPromise, {
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

  return await fontsLoadPromise;
}
