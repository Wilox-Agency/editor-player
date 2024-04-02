import { arrayOf, intersection, morph, type, union } from 'arktype';

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

export const srtSubtitlesSchema = type({
  transcriptionJobStatus: '"finished"',
  transcriptionResult: {
    display: morph('string', (display) => display.trim()),
    displayWords: arrayOf({
      displayText: 'string',
      offsetInTicks: 'number',
      durationInTicks: 'number',
    }),
  },
});

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
            /* Validating using 'unknown' instead of the SRT subtitles schema
            because the SRT may still be generating; in this case, it is defined
            with another format, but it should be ignored rather than causing a
            validation error */
            'srt?': 'unknown',
          },
          union(
            { imageData: { finalImage: { url: 'string>1' } } },
            { videoData: { finalVideo: { url: 'string>1' } } }
          )
        )
      ),
    },
  },
  { keys: 'distilled' }
);

/** This schema extends the slideshow lesson schema, adding the course cover and
 * section title, which are necessary for the first slide, and the color theme
 * name and background music URL, which are part of the customization */
export const slideshowLessonWithExternalInfoSchema = intersection(
  slideshowLessonSchema,
  {
    courseCover: 'string',
    sectionTitle: 'string',
    // TODO: Validate color theme name using the `colorThemeNames` constant
    'colorThemeName?': '"default" | "oxford" | "twilight" | "pastel"',
    'backgroundMusicUrl?': 'string',
  },
  { keys: 'distilled' }
);

function splitLessonParagraph(paragraph: string) {
  const splitParagraphs = paragraph
    // Separate the sentences
    .split('.')
    // Trim each sentence
    .map((sentence) => sentence.trim())
    // Filter empty strings
    .filter(Boolean)
    // Re-add the period at the end
    .map((sentence) => sentence + '.');
  const minParagraphLength = 75;

  // Merge the paragraphs that are too short with an adjacent one
  let splitParagraphIndex = 0;
  while (splitParagraphIndex < splitParagraphs.length) {
    const splitParagraph = splitParagraphs[splitParagraphIndex]!;

    // If the current paragraph is not below min length, do nothing
    if (splitParagraph.length >= minParagraphLength) {
      splitParagraphIndex++;
      continue;
    }

    const previousSplitParagraph = splitParagraphs[splitParagraphIndex - 1];
    const nextSplitParagraph = splitParagraphs[splitParagraphIndex + 1];

    // If there's no paragraph to merge with, do nothing
    if (!previousSplitParagraph && !nextSplitParagraph) {
      splitParagraphIndex++;
      continue;
    }

    /* If there's a paragraph to merge with, then merge with the shortest of
    them */
    const shouldMergeWithPreviousParagraph =
      previousSplitParagraph &&
      (!nextSplitParagraph ||
        previousSplitParagraph.length < nextSplitParagraph.length);
    if (shouldMergeWithPreviousParagraph) {
      splitParagraphs[
        splitParagraphIndex - 1
      ] = `${previousSplitParagraph} ${splitParagraph}`;
    } else {
      /* If the condition above is not met, then the next paragraph is
      guaranteed to exist (because this condition and the previous one together
      guarantee that, but TypeScript is not able to recognize it) */
      splitParagraphs[
        splitParagraphIndex + 1
      ] = `${nextSplitParagraph!} ${splitParagraph}`;
    }

    // Remove the current paragraph after being merged with another
    splitParagraphs.splice(splitParagraphIndex, 1);
  }

  return splitParagraphs;
}

function parseSlideshowLessonParagraphs(
  lessonParagraphs: (typeof slideshowLessonSchema)['infer']['elementLesson']['paragraphs']
) {
  const slides: SlideshowContent['slides'] = [];

  // Create a slide for each lesson paragraph
  for (const lessonParagraph of lessonParagraphs) {
    let validSrt;
    try {
      validSrt = srtSubtitlesSchema.assert(lessonParagraph.srt);
    } catch (error) {
      /* empty */
    }

    let slideParagraphs;
    if (!validSrt) {
      /* If there are no valid SRT subtitles, then try to split the lesson
      paragraph, but only use the split paragraphs if there's at most 2 of them,
      otherwise just use the entire lesson paragraph as the only paragraph in
      the slide. */
      /* But why at most 2 paragraphs? Because a single slide can have at most 2
      paragraphs, and to create sub-slides (which happens when there are 3 or
      more paragraphs), the timestamps of when each paragraph starts on the
      audio are required, and they're derived from the SRT subtitles. */
      /* And why these timestamps are necessary? Because there's only one audio
      file per lesson paragraph, so when a single lesson paragraph is dividided
      into more than one slide, the audio needs to stop and start at specific
      times so it doesn't play during the transitions. */
      const splitParagraphs = splitLessonParagraph(lessonParagraph.content);
      if (splitParagraphs.length <= 2) {
        /* If the lesson paragraph was split into at most 2 paragrahs, then use
        them */
        slideParagraphs = splitParagraphs;
      } else {
        // just use the lesson paragraph content as the only paragraph in the slide
        slideParagraphs = [lessonParagraph.content];
      }
    } else {
      /* But if there are valid SRT subtitles (which are not used as subtitles,
      but they have the necessary timings to define when each audio should begin
      or stop), split the text from the SRT */
      slideParagraphs = splitLessonParagraph(
        validSrt.transcriptionResult.display
      );
    }

    // Create the slide
    slides.push({
      title: lessonParagraph.translatedTitleAI || lessonParagraph.titleAI,
      asset:
        'imageData' in lessonParagraph
          ? { type: 'image', url: lessonParagraph.imageData.finalImage.url }
          : { type: 'video', url: lessonParagraph.videoData.finalVideo.url },
      audioUrl: lessonParagraph.audioUrl,
      paragraphs: slideParagraphs,
      srt: validSrt,
    });
  }

  return slides;
}

export function parseSlideshowLesson(
  slideshowLesson: (typeof slideshowLessonWithExternalInfoSchema)['infer']
): SlideshowContent {
  const slideshowContent: SlideshowContent = {
    title: slideshowLesson.sectionTitle,
    asset: { type: 'image', url: slideshowLesson.courseCover },
    /* Currently, there's no audio for the first slide, but it will be added
    soon */
    audioUrl: undefined,
    slides: parseSlideshowLessonParagraphs(
      slideshowLesson.elementLesson.paragraphs
    ),
    colorThemeName: slideshowLesson.colorThemeName,
    backgroundMusicUrl: slideshowLesson.colorThemeName,
  };

  return slideshowContent;
}
