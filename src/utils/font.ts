import FontFaceObserver from 'fontfaceobserver';
// import { toast } from 'sonner';

import { showWarningToastWhenAssetLoadingTakesTooLong } from '@/utils/toast';

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

  showWarningToastWhenAssetLoadingTakesTooLong('font', fontLoadPromise);

  await fontLoadPromise;
}

export async function waitUntilAllSupportedFontsLoad() {
  const fontLoadPromises = fontFamilies.map((fontFamily) => {
    return waitUntilFontLoads(fontFamily);
  });
  const fontsLoadPromise = Promise.allSettled(fontLoadPromises);

  // TODO - Substitute by progress bar
  // const toastId = toast.loading('Loading fonts...');
  // fontsLoadPromise
  //   .then((results) => {
  //     const numberOfSuccesses = results.filter(
  //       (result) => result.status === 'fulfilled'
  //     ).length;
  //     const totalOfResults = results.length;

  //     if (numberOfSuccesses === totalOfResults) {
  //       toast.success('All fonts loaded successfully!', { id: toastId });
  //       return;
  //     }
  //     toast.warning(
  //       `${numberOfSuccesses} fonts loaded out of ${totalOfResults}.`,
  //       { id: toastId }
  //     );
  //   })
  //   .catch(() => {
  //     toast.error('Could not load fonts.', { id: toastId });
  //   });

  return await fontsLoadPromise;
}
