import { type } from 'arktype';

import { type AssetType, generateAssetAttributes } from './asset';
import { generateRects } from './rect';
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
import { waitUntilAllSupportedFontsLoad } from '@/utils/font';
import { findLast } from '@/utils/array';
import type { CanvasElementOfType, SlideWithAudio } from '@/utils/types';

async function getSlideDuration(audio: AudioWithStartEnd | undefined) {
  let duration;
  if (audio) {
    if (audio.start !== undefined) {
      duration = audio.end - audio.start;
    } else {
      duration = await getAudioDuration(audio.url);
    }
  }

  // Use a default duration of 2
  return duration || 2;
}

async function generateSlideWithSubSlides(
  slideContent: SlideshowContent['slides'][number],
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
  }: {
    title: string;
    paragraphs?: string[];
    asset: { type: AssetType; url: string };
    audio?: AudioWithStartEnd;
  },
  colorPalette: string[]
) {
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
  } satisfies SlideWithAudio;
}

export async function generateSlides(presentationContent: SlideshowContent) {
  /* Wait until all fonts are loaded before generating the slides to prevent
  wrong text measurements */
  await waitUntilAllSupportedFontsLoad();

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
    },
    colorPalette
  );

  const otherSlides: SlideWithAudio[] = [];
  for (const slideContent of presentationContent.slides) {
    if (slideContent.paragraphs.length >= 3) {
      /* If the slide has 3 or more paragraphs, then it should be separated into
      sub-slides */
      const slideWithSubSlides = await generateSlideWithSubSlides(
        slideContent,
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
        },
        colorPalette
      )
    );
  }

  return [firstSlide, ...otherSlides];
}
