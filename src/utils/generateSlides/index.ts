import { type } from 'arktype';

import {
  type AssetType,
  generateAssetAttributes,
  generateFullSizeAssetAttributes,
  getVideoDuration,
} from './asset';
import { generateFullSizeRect, generateRects } from './rect';
import {
  baseAttributesByTextType,
  fitTextIntoRect,
  generateTextAttributes,
} from './text';
import {
  chooseTextColor,
  colorThemeOptions,
  getUnusedRectColorsFromSlide,
} from './color';
import type { AudioWithStartEnd, SlideshowContent } from './sharedTypes';
import { getElementThatContainsText } from '@/utils/konva/text';
import { getAudioDuration } from '@/utils/audio';
import { findLast } from '@/utils/array';
import type {
  CanvasElementOfType,
  SlideFlags,
  SlideWithAudio,
} from '@/utils/types';

const DEFAULT_SLIDE_DURATION = 2;

async function getSlideDuration(audio: AudioWithStartEnd | undefined) {
  let duration;
  if (audio) {
    if (audio.start !== undefined) {
      duration = audio.end - audio.start;
    } else {
      duration = await getAudioDuration(audio.url);
    }
  }

  return duration || DEFAULT_SLIDE_DURATION;
}

async function generateSlideWithSubSlides(
  {
    lessonParagraphIndex,
    ...slideContent
  }: SlideshowContent['slides'][number] & {
    lessonParagraphIndex: number | undefined;
  },
  colorPalette: string[]
) {
  // Generate the main slide
  const mainSlide: SlideWithAudio = await generateSlide(
    {
      title: slideContent.title,
      paragraphs: slideContent.paragraphs.slice(0, 1),
      asset: slideContent.asset,
      /* TODO: Report TypeScript where the first item is always considered to be
      defined even though the type definition doesn't say that */
      audio: slideContent.audios?.[0],
      lessonParagraphIndex,
      // None of the flags are used with slides with sub-slides
      flags: undefined,
    },
    colorPalette
  );

  const subSlides: SlideWithAudio[] = [];

  // Then generate sub-slides based on the main one
  for (const [paragraphIndex, paragraph] of slideContent.paragraphs
    .slice(1)
    .entries()) {
    const previousSlide = subSlides[subSlides.length - 1] || mainSlide;

    const audio = slideContent.audios?.[paragraphIndex + 1];

    // Create a copy of the previous slide with new IDs for the elements
    const subSlide: SlideWithAudio = {
      canvasElements: previousSlide.canvasElements.map((element) => ({
        ...element,
        id: crypto.randomUUID(),
      })),
      duration: await getSlideDuration(audio),
      audio,
      lessonParagraphIndex,
      // None of the flags are used with slides with sub-slides
      flags: undefined,
    };

    const textElement = findLast(subSlide.canvasElements, (element) => {
      return element.type === 'text';
    }) as CanvasElementOfType<'text'> | undefined;

    if (!textElement) {
      throw new Error('Text element not found when generating sub-slides.');
    }

    const textContainer = getElementThatContainsText({
      /* The paragraph element will always be the last one, so it's not even
      necessary to separate the elements before the text */
      slideElementsBeforeText: subSlide.canvasElements,
      canvasTextElement: textElement,
    });

    if (textContainer?.type !== 'rect') {
      throw new Error('Text element is not contained by a rect element.');
    }

    /* Change the color of the text container if there's one that's not being
    used already by another rect */
    const unusedRectColors = getUnusedRectColorsFromSlide(
      subSlide.canvasElements,
      colorPalette
    );
    if (unusedRectColors[0]) {
      textContainer.fill = unusedRectColors[0];
    }

    const baseAttributes = baseAttributesByTextType.paragraph;
    // Get the new font size, width and height
    const { fontSize, width, height } = fitTextIntoRect(
      paragraph,
      baseAttributes,
      { width: textContainer.width!, height: textContainer.height! }
    );

    const textAttributes = {
      ...baseAttributes,
      id: crypto.randomUUID(),
      type: 'text',
      text: paragraph,
      x: textContainer.x! + textContainer.width! / 2 - width / 2,
      y: textContainer.y! + textContainer.height! / 2 - height / 2,
      width,
      fontSize,
      fill: chooseTextColor(textContainer.fill!),
    } satisfies CanvasElementOfType<'text'>;
    // Set the new text attributes
    Object.assign(textElement, textAttributes);

    subSlides.push(subSlide);
  }

  return [mainSlide, ...subSlides];
}

export async function generateSlide(
  {
    title,
    paragraphs = [],
    asset,
    audio,
    lessonParagraphIndex,
    flags,
  }: {
    title: string;
    paragraphs?: string[];
    asset: { type: AssetType; url: string };
    audio?: AudioWithStartEnd;
    lessonParagraphIndex: number | undefined;
    flags: SlideFlags | undefined;
  },
  colorPalette: string[]
) {
  if (flags?.isImageOnly?.enabled && asset.type === 'image') {
    /* If using the `isImageOnly` flag, then:
    - the slide should be composed of only an image;
    - the generated audio may or not be used depending on the
      `useGeneratedAudio` option;
    - the duration of the slide depends on the `slideDuration` option. If the
      option is not provided, then, if using a generated audio, the slide
      duration defaults to the audio duration, else it uses the default slide
      duration. */
    const assetElement = await generateFullSizeAssetAttributes({
      type: asset.type,
      url: asset.url,
    });

    const defaultDuration = await getSlideDuration(
      flags.isImageOnly.useGeneratedAudio ? audio : undefined
    );
    const duration = flags.isImageOnly.slideDuration
      ? // Ensure that the duration is not less than the default duration
        Math.max(defaultDuration, flags.isImageOnly.slideDuration)
      : // Use the default duration if the slide duration option is not provided
        defaultDuration;

    return {
      canvasElements: [assetElement],
      duration,
      audio: flags.isImageOnly.useGeneratedAudio ? audio : undefined,
      lessonParagraphIndex,
      flags,
    } satisfies SlideWithAudio;
  }

  if (flags?.isVideoOnly && asset.type === 'video') {
    /* If using the `isVideoOnly` flag, then:
    - the slide should be composed of only a video
    - the audio of the video should be used instead of the generated audio
    - the slide should have the same duration as the video */
    const assetElement = await generateFullSizeAssetAttributes({
      type: asset.type,
      url: asset.url,
    });

    const duration = await getVideoDuration(asset.url);

    return {
      canvasElements: [assetElement],
      duration,
      lessonParagraphIndex,
      flags,
    } satisfies SlideWithAudio;
  }

  const assetElement = await generateAssetAttributes(asset);

  let rectsAndTexts: CanvasElementOfType<'rect' | 'text'>[];

  const numberOfParagraphs = type('0 | 1 | 2').assert(paragraphs.length);

  const { titleRect, paragraphRects, extraRect } = generateRects({
    numberOfParagraphs: numberOfParagraphs,
    assetElement,
    paragraphs,
    colorPalette,
  });

  rectsAndTexts = [
    // All rects
    titleRect,
    ...paragraphRects,
    ...(extraRect ? [extraRect] : []),
    // Title
    {
      ...generateTextAttributes({ type: 'title', value: title }, titleRect),
      fill: chooseTextColor(titleRect.fill),
    },
    // Paragraphs
    ...paragraphs.map((paragraph, paragraphIndex) => {
      const paragraphRect = paragraphRects[paragraphIndex];
      // This error should never happen, it's here more for type-safety
      if (!paragraphRect) {
        throw new Error(
          `Paragraph rect was not generated for paragraph with index ${paragraphIndex}`
        );
      }

      return {
        ...generateTextAttributes(
          { type: 'paragraph', value: paragraph },
          paragraphRect
        ),
        fill: chooseTextColor(paragraphRect.fill),
      } satisfies CanvasElementOfType<'text'>;
    }),
  ];

  rectsAndTexts ??= [];

  const duration = await getSlideDuration(audio);

  return {
    canvasElements: [assetElement, ...rectsAndTexts],
    duration,
    audio,
    lessonParagraphIndex,
    // All the flags are already handled at the start of the function
    flags: undefined,
  } satisfies SlideWithAudio;
}

async function generateEndingSlide(colorPalette: string[]) {
  const rect = generateFullSizeRect({ colorPalette });
  const text = {
    ...generateTextAttributes(
      // TODO: Add internationalization
      { type: 'title', value: 'Fin de la lección' },
      rect
    ),
    fill: chooseTextColor(rect.fill),
  };

  return {
    canvasElements: [rect, text],
    duration: await getSlideDuration(undefined),
    audio: undefined,
    lessonParagraphIndex: undefined,
    flags: undefined,
  } satisfies SlideWithAudio;
}

export async function generateSlides(presentationContent: SlideshowContent) {
  const colorPalette =
    colorThemeOptions[presentationContent.colorThemeName || 'default'];

  // The only piece of text in the first slide will be the presentation title
  const firstSlide: SlideWithAudio = await generateSlide(
    {
      title: presentationContent.title,
      asset: presentationContent.asset,
      audio: presentationContent.audioUrl
        ? { url: presentationContent.audioUrl }
        : undefined,
      lessonParagraphIndex: undefined,
      // The first slide doesn't have any flags
      flags: undefined,
    },
    colorPalette
  );

  const otherSlides: SlideWithAudio[] = [];
  for (const [
    lessonParagraphIndex,
    slideContent,
  ] of presentationContent.slides.entries()) {
    if (slideContent.paragraphs.length >= 3) {
      /* If the slide has 3 or more paragraphs, then it should be separated into
      sub-slides */
      const slideWithSubSlides = await generateSlideWithSubSlides(
        { ...slideContent, lessonParagraphIndex },
        colorPalette
      );
      otherSlides.push(...slideWithSubSlides);
      continue;
    }

    otherSlides.push(
      await generateSlide(
        {
          title: slideContent.title,
          paragraphs: slideContent.paragraphs,
          asset: slideContent.asset,
          audio: slideContent.audios?.[0],
          lessonParagraphIndex,
          flags: slideContent.flags,
        },
        colorPalette
      )
    );
  }

  const endingSlide = await generateEndingSlide(colorPalette);
  return [firstSlide, ...otherSlides, endingSlide];
}
