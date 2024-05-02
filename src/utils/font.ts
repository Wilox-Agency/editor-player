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

  /* Using a long max wait time to account for bad internet connection, though
  it's really unlikely for a font to take this long */
  const maxWaitTime = 60 * 1000; // 60 seconds
  const fontLoadPromise = new FontFaceObserver(fontFamily).load(
    null,
    maxWaitTime
  );

  let warningToastId: string | number | undefined;
  // Show a toast if the font doesn't load after 10 seconds
  const toastTimeout = setTimeout(() => {
    warningToastId = toast.warning(
      `The font "${fontFamily}" is taking too long to load. Consider reloading the page.`,
      // Keep the toast visible as long as it's not dismissed
      { duration: Infinity }
    );
  }, 10_000 /* 10 seconds */);

  await fontLoadPromise;

  // Clear the timeout after the font is loaded
  clearTimeout(toastTimeout);
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

  const toastId = toast.loading('Loading fonts...');
  fontsLoadPromise
    .then((results) => {
      const numberOfSuccesses = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const totalOfResults = results.length;

      if (numberOfSuccesses === totalOfResults) {
        toast.success('All fonts loaded successfully!', { id: toastId });
        return;
      }
      toast.warning(
        `${numberOfSuccesses} fonts loaded out of ${totalOfResults}.`,
        { id: toastId }
      );
    })
    .catch(() => {
      toast.error('Could not load fonts.', { id: toastId });
    });

  return await fontsLoadPromise;
}
