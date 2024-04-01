import gsap from 'gsap';
import { type } from 'arktype';
import contrast from 'contrast';

import { type AssetType, generateAssetAttributes } from './asset';
import { generateRects } from './rect';
import {
  baseAttributesByTextType,
  fitTextIntoRect,
  generateTextAttributes,
} from './text';
import { getAudioDuration } from './audio';
import { colorThemeOptions } from './colors';
import type { SlideshowContent } from './sharedTypes';
import { getElementThatContainsText } from '@/utils/konva/text';
import { findLast } from '@/utils/array';
import type {
  CanvasElement,
  CanvasElementOfType,
  Slide,
  SlideWithAudioUrl,
} from '@/utils/types';

const ColorPalette = {
  black: '#000000',
  gray: '#bdbabb',
  white: '#ffffff',
  purple: '#d1a3f3',
  green: '#28fa9d',
  yellow: '#fffc5a',
} as const;

function chooseTextColor(textContainerColor: string) {
  if (contrast(textContainerColor) === 'dark') return ColorPalette.white;
  return ColorPalette.black;
}

function getUnusedRectColorsFromSlide(
  canvasElements: CanvasElement[],
  colorPalette: string[]
) {
  const rectElements = canvasElements.filter(
    (element): element is CanvasElementOfType<'rect'> => {
      return element.type === 'rect';
    }
  );
  const rectColors = rectElements.map((rect) => rect.fill);
  const unusedRectColors = colorPalette.filter(
    (color) => !rectColors.includes(color)
  );
  // Shuffle the colors to add some randomness
  gsap.utils.shuffle(unusedRectColors);

  return unusedRectColors;
}

// TODO: Add support for audio to slides with subslides
async function generateSlideWithSubSlides(
  slideContent: SlideshowContent['slides'][number],
  colorPalette: string[]
) {
  // Generate the main slide
  const mainSlide: Slide = await generateSlide(
    {
      title: slideContent.title,
      paragraphs: slideContent.paragraphs.slice(0, 1),
      asset: slideContent.asset,
    },
    colorPalette
  );

  const subSlides: Slide[] = [];

  // Then generate sub-slides based on the main one
  for (const paragraph of slideContent.paragraphs.slice(1)) {
    const previousSlide = subSlides[subSlides.length - 1] || mainSlide;
    // Create a copy of the previous slide with new IDs for the elements
    const subSlide: Slide = {
      canvasElements: previousSlide.canvasElements.map((element) => ({
        ...element,
        id: crypto.randomUUID(),
      })),
      duration: previousSlide.duration,
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
    audioUrl,
  }: {
    title: string;
    paragraphs?: string[];
    asset: { type: AssetType; url: string };
    audioUrl?: string;
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

  const duration = audioUrl ? await getAudioDuration(audioUrl) : undefined;

  return {
    canvasElements: [assetElement, ...rectsAndTexts],
    duration: duration || 2,
    audioUrl,
  } satisfies SlideWithAudioUrl;
}

export async function generateSlides(presentationContent: SlideshowContent) {
  const colorPalette =
    colorThemeOptions[presentationContent.colorThemeName || 'default'];

  // The only piece of text in the first slide will be the presentation title
  const firstSlide: SlideWithAudioUrl = await generateSlide(
    {
      title: presentationContent.title,
      asset: presentationContent.asset,
      audioUrl: presentationContent.audioUrl,
    },
    colorPalette
  );

  const otherSlides: SlideWithAudioUrl[] = [];
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

    otherSlides.push(await generateSlide(slideContent, colorPalette));
  }

  return [firstSlide, ...otherSlides];
}
