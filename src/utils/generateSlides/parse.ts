import { arrayOf, intersection, morph, type, union } from 'arktype';

import { getSubSlideAudioStartEnd } from './audio';
import type { SlideshowContent, SrtSubtitles } from './sharedTypes';
import { getLoremPicsum } from '@/utils/random';
import type { SlideshowLessonWithExternalInfo } from '@/utils/types';

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

/**
 * If the input is valid, it gets **mutated** by trimming the string from
 * `transcriptionResult.display`
 */
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
            { videoData: { finalVideo: { url: 'string>1' } } },
            { imageData: { finalImage: { url: 'string>1' } } }
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
    'backgroundMusicUrl?': 'string | null',
    'organizationLogoUrl?': 'string | null',
  },
  { keys: 'distilled' }
);

const sentenceTerminalRegex = /\p{Sentence_Terminal}(?=$|\s)/mu;
const minParagraphLength = 75;
const maxParagraphLength = 200;

function splitSentences(text: string) {
  const splitText: string[] = [];
  text = text.trim();

  let matchArray;
  while (
    (matchArray = text.match(sentenceTerminalRegex))?.index !== undefined
  ) {
    /* TODO: Report TypeScript bug where the match array is not inferred as
    non-null even though the index is */
    splitText.push(text.slice(0, matchArray!.index + 1));
    text = text.slice(matchArray!.index + 1).trim();
  }

  if (text !== '') {
    splitText.push(text);
  }

  return splitText;
}

function splitLessonParagraph(paragraph: string) {
  // Separate the sentences
  const splitParagraphs = splitSentences(paragraph);

  // Merge the paragraphs that are too short with an adjacent one
  let splitParagraphIndex = 0;
  while (splitParagraphIndex < splitParagraphs.length) {
    const splitParagraph = splitParagraphs[splitParagraphIndex]!;

    /* If the current paragraph is not below the min length, do nothing and
    continue to the next paragraph */
    if (splitParagraph.length >= minParagraphLength) {
      splitParagraphIndex++;
      continue;
    }

    const previousSplitParagraph = splitParagraphs[splitParagraphIndex - 1];
    const nextSplitParagraph = splitParagraphs[splitParagraphIndex + 1];

    /* If there's no paragraph to merge with, do nothing and continue to the
    next paragraph */
    if (!previousSplitParagraph && !nextSplitParagraph) {
      splitParagraphIndex++;
      continue;
    }

    /* If there's a paragraph to merge with, then merge with the shortest of
    them */
    const shouldMergeWithPreviousParagraph =
      // The previous paragraph is defined
      previousSplitParagraph &&
      /* The next paragraph does not exist, or it exists but the previous
      paragraph is shorter than it or has same length */
      (!nextSplitParagraph ||
        previousSplitParagraph.length <= nextSplitParagraph.length) &&
      /* The paragraph combined with the previous one is below or equal to the
      max length */
      splitParagraph.length + previousSplitParagraph.length <=
        maxParagraphLength;
    if (shouldMergeWithPreviousParagraph) {
      splitParagraphs[
        splitParagraphIndex - 1
      ] = `${previousSplitParagraph} ${splitParagraph}`;
    }

    const shouldMergeWithNextParagraph =
      // The next paragraph is defined
      nextSplitParagraph &&
      // The paragraph was not merged with the previous one
      !shouldMergeWithPreviousParagraph &&
      /* The paragraph combined with the next one is below or equal to the max
      length */
      splitParagraph.length + nextSplitParagraph.length <= maxParagraphLength;
    if (shouldMergeWithNextParagraph) {
      splitParagraphs[
        splitParagraphIndex + 1
      ] = `${splitParagraph} ${nextSplitParagraph}`;
    }

    /* If the paragraph was not merged with another, then continue to the next
    paragraph */
    const didMerge =
      shouldMergeWithPreviousParagraph || shouldMergeWithNextParagraph;
    if (!didMerge) {
      splitParagraphIndex++;
      continue;
    }

    // Remove the current paragraph after being merged with another
    splitParagraphs.splice(splitParagraphIndex, 1);
  }

  return splitParagraphs;
}

function splitLessonParagraphInto2(paragraph: string) {
  const middleIndex = Math.ceil((paragraph.length - 1) / 2);
  const middleCharacter = paragraph[middleIndex];

  const splitParagraph = (() => {
    const isSentenceTerminal =
      !!middleCharacter && sentenceTerminalRegex.test(middleCharacter);
    if (isSentenceTerminal) {
      return [
        paragraph.slice(0, middleIndex + 1),
        paragraph.slice(middleIndex + 1).trim(),
      ];
    }

    let backwardIterator = middleIndex - 1;
    // Checking the characters on the left
    while (backwardIterator >= 0) {
      const character = paragraph[backwardIterator];
      const isSentenceTerminal =
        !!character && sentenceTerminalRegex.test(character);
      if (isSentenceTerminal) break;

      backwardIterator--;
    }

    let forwardIterator = middleIndex + 1;
    // Checking the characters on the right
    while (forwardIterator <= paragraph.length - 1) {
      const character = paragraph[forwardIterator];
      const isSentenceTerminal =
        !!character && sentenceTerminalRegex.test(character);
      if (isSentenceTerminal) break;

      forwardIterator++;
    }

    /* If the character at an iterator index is undefined, it means a sentence
    terminal was NOT found by that iterator */
    const backwardIteratorDistance =
      paragraph[backwardIterator] === undefined
        ? undefined
        : Math.abs(backwardIterator - middleIndex);
    const forwardIteratorDistance =
      paragraph[forwardIterator] === undefined
        ? undefined
        : Math.abs(forwardIterator - middleIndex);

    if (
      backwardIteratorDistance &&
      (!forwardIteratorDistance ||
        backwardIteratorDistance < forwardIteratorDistance)
    ) {
      return [
        paragraph.slice(0, backwardIterator + 1),
        paragraph.slice(backwardIterator + 1).trim(),
      ];
    }
    if (
      forwardIteratorDistance &&
      (!backwardIteratorDistance ||
        forwardIteratorDistance < backwardIteratorDistance)
    ) {
      return [
        paragraph.slice(0, forwardIterator + 1),
        paragraph.slice(forwardIterator + 1).trim(),
      ];
    }
  })();

  /* If it was not possible to divide the paragraph or any of the resulting
  paragraphs is below the min length, then just return the entire paragraph */
  if (
    !splitParagraph ||
    splitParagraph.some((paragraph) => paragraph.length < minParagraphLength)
  ) {
    return [paragraph];
  }

  return splitParagraph;
}

function parseSlideshowLessonParagraphs(
  lessonParagraphs: (typeof slideshowLessonSchema)['infer']['elementLesson']['paragraphs']
) {
  const slides: SlideshowContent['slides'] = [];

  // Create a slide for each lesson paragraph
  for (const lessonParagraph of lessonParagraphs) {
    const { slideParagraphs, audios } = (() => {
      const splitParagraphs = splitLessonParagraph(lessonParagraph.content);

      /* Only use the resulting paragraphs if there's a valid SRT or the lesson
      paragraph was split into at most 2 paragraphs */
      /* But why at most 2 paragraphs? Because a single slide can have at most 2
      paragraphs, and to create sub-slides (which happens when there are 3 or
      more paragraphs), the timestamps of when each paragraph starts on the
      audio are required, and they're derived from the SRT subtitles. */
      /* And why these timestamps are necessary? Because there's only one audio
      file per lesson paragraph, so when a single lesson paragraph is dividided
      into more than one slide, the audio needs to stop and start at specific
      times so it doesn't play during the transitions. */
      const willGenerateSubSlides = splitParagraphs.length > 2;
      if (!willGenerateSubSlides) {
        return {
          slideParagraphs: splitParagraphs,
          audios: [{ url: lessonParagraph.audioUrl }] as const,
        };
      }

      let validSrt: SrtSubtitles | undefined;
      try {
        /* The `srtSubtitlesSchema` uses `morph`, which means the input will be
        mutated if it's valid, so the object should be copied before passing it to
        `assert` */
        const srtCopy = JSON.parse(JSON.stringify(lessonParagraph.srt));
        validSrt = srtSubtitlesSchema.assert(srtCopy);
      } catch (error) {
        /* empty */
      }

      if (validSrt) {
        let audios;
        try {
          audios = splitParagraphs.map((paragraph) => {
            return {
              url: lessonParagraph.audioUrl,
              ...getSubSlideAudioStartEnd(paragraph, validSrt!),
            };
          });
        } catch (error) {
          /* empty */
        }

        if (audios) {
          return { slideParagraphs: splitParagraphs, audios };
        }
      }

      /* If the SRT is invalid, or the lesson paragraph content and SRT text
      don't match, fallback to splitting the lesson paragraph into only 2
      paragraphs */
      return {
        slideParagraphs: splitLessonParagraphInto2(lessonParagraph.content),
        audios: [{ url: lessonParagraph.audioUrl }] as const,
      };
    })();

    // Create the slide
    slides.push({
      title: lessonParagraph.translatedTitleAI || lessonParagraph.titleAI,
      asset:
        'videoData' in lessonParagraph
          ? { type: 'video', url: lessonParagraph.videoData.finalVideo.url }
          : { type: 'image', url: lessonParagraph.imageData.finalImage.url },
      paragraphs: slideParagraphs,
      audios,
    });
  }

  return slides;
}

export function parseSlideshowLesson(
  slideshowLesson: SlideshowLessonWithExternalInfo
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
    backgroundMusicUrl: slideshowLesson.backgroundMusicUrl,
  };

  return slideshowContent;
}
