import { arrayOf, type } from 'arktype';

import type { SlideshowContent } from './sharedTypes';
import { getLoremPicsum } from '@/utils/random';

export const firstItemSchema = type({ type: '"h1"', content: 'string' });
export const restSchema = type(
  arrayOf({ type: '"h2" | "p"', content: 'string' })
);

type SlideshowBase = readonly [
  (typeof firstItemSchema)['infer'],
  ...(typeof restSchema)['infer']
];

export function parseSlideshowBase(
  slideshowBase: SlideshowBase
): SlideshowContent {
  const slideshowContent: SlideshowContent = {
    title: slideshowBase[0].content,
    asset: { type: 'image', url: getLoremPicsum() },
    slides: [],
  };

  const otherItems = slideshowBase.slice(1) as SlideshowBase[1][];
  for (const item of otherItems) {
    if (item.type === 'h2') {
      slideshowContent.slides.push({
        title: item.content,
        asset: { type: 'image', url: getLoremPicsum() },
        paragraphs: [],
      });
      continue;
    }

    const lastSlide =
      slideshowContent.slides[slideshowContent.slides.length - 1];
    /* When there's no last slide, it means there is a paragraph before any
    heading other than 'h1', so create a slide using the 'h1' as the title */
    if (!lastSlide) {
      slideshowContent.slides.push({
        title: slideshowBase[0].content,
        asset: { type: 'image', url: getLoremPicsum() },
        paragraphs: [item.content],
      });
      continue;
    }

    lastSlide.paragraphs.push(item.content);
  }

  return slideshowContent;
}
