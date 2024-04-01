import { arrayOf, intersection, type, union } from 'arktype';

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

/** This schema does not include all the attributes a slideshow lesson has, but
 * only the ones that are used in the app */
export const slideshowLessonSchema = type(
  {
    elementCode: 'string',
    elementLesson: {
      paragraphs: arrayOf(
        intersection(
          {
            content: 'string',
            audioUrl: 'string',
            titleAI: 'string',
            'translatedTitleAI?': 'string',
          },
          union(
            { imageData: { finalImage: { url: 'string' } } },
            { videoData: { finalVideo: { url: 'string' } } }
          )
        )
      ),
    },
  },
  { keys: 'distilled' }
);

/** This schema extends the slideshow lesson schema, adding the course cover and
 * section title, which are necessary for the first slide, and the color theme
 * name which is part of the customization */
export const slideshowLessonWithExternalInfoSchema = intersection(
  slideshowLessonSchema,
  {
    courseCover: 'string',
    sectionTitle: 'string',
    // TODO: Validate color theme name using the `colorThemeNames` constant
    'colorThemeName?': '"default" | "oxford" | "twilight" | "pastel"',
  }
);

export function parseSlideshowLesson(
  slideshowLesson: (typeof slideshowLessonWithExternalInfoSchema)['infer']
): SlideshowContent {
  const slideshowContent: SlideshowContent = {
    title: slideshowLesson.sectionTitle,
    asset: { type: 'image', url: slideshowLesson.courseCover },
    /* Currently, there's no audio for the lesson title, but it will be added
    soon */
    audioUrl: undefined,
    slides: [],
    colorThemeName: slideshowLesson.colorThemeName,
  };

  for (const lessonParagraph of slideshowLesson.elementLesson.paragraphs) {
    slideshowContent.slides.push({
      title: lessonParagraph.translatedTitleAI || lessonParagraph.titleAI,
      asset:
        'imageData' in lessonParagraph
          ? { type: 'image', url: lessonParagraph.imageData.finalImage.url }
          : { type: 'video', url: lessonParagraph.videoData.finalVideo.url },
      audioUrl: lessonParagraph.audioUrl,
      paragraphs: [lessonParagraph.content],
    });
  }

  return slideshowContent;
}
