import { type } from 'arktype';

import { type AssetType, generateAssetAttributes } from './asset';
import { generateRects } from './rect';
import { fitTextIntoRect, generateTextAttributes } from './text';
import { getElementThatContainsText } from '@/utils/slidesPlayer/setTextContainers';
import { findLast } from '@/utils/array';
import type { CanvasElementOfType, Slide } from '@/utils/types';

type PresentationContent = {
  title: string;
  asset: { type: AssetType; url: string };
  slides: {
    title: string;
    paragraphs: string[];
    asset: { type: AssetType; url: string };
  }[];
};

const ColorPalette = {
  black: '#000000',
  gray: '#bdbabb',
  white: '#ffffff',
  purple: '#d1a3f3',
  green: '#28fa9d',
  yellow: '#fffc5a',
} as const;

export const rectColorPalette = [
  ColorPalette.black,
  ColorPalette.purple,
  ColorPalette.green,
  ColorPalette.yellow,
];

function chooseTextColor(
  textContainerColor: (typeof rectColorPalette)[number]
) {
  if (textContainerColor === ColorPalette.black) return ColorPalette.white;
  return ColorPalette.black;
}

async function generateSlideWithSubSlides(
  slideContent: PresentationContent['slides'][number]
) {
  // Generate the main slide
  const mainSlide: Slide = await generateSlide({
    title: slideContent.title,
    paragraphs: slideContent.paragraphs.slice(0, 1),
    asset: slideContent.asset,
  });

  // Then generate sub-slides based on the main one
  const subSlides = slideContent.paragraphs.slice(1).map((paragraph) => {
    // Create a copy of the main slide with new IDs for the elements
    const subSlide: Slide = {
      canvasElements: [
        ...mainSlide.canvasElements.map((element) => ({
          ...element,
          id: crypto.randomUUID(),
        })),
      ],
      duration: mainSlide.duration,
    };

    const textElement = findLast(mainSlide.canvasElements, (element) => {
      return element.type === 'text';
    }) as CanvasElementOfType<'text'> | undefined;

    if (!textElement) {
      throw new Error('Text element not found when generating sub-slides.');
    }

    const textContainer = getElementThatContainsText({
      /* The paragraph element will always be the last one, so it's not even
      necessary to separate the elements before the text */
      slideElementsBeforeText: mainSlide.canvasElements,
      canvasTextElement: textElement,
    });

    if (textContainer?.type !== 'rect') {
      throw new Error('Text element is not contained by a rect element.');
    }

    /* Change the color of the text container if there's one that's not being
    used already by another rect */
    const colorsNotBeingUsed = rectColorPalette.filter((color) => {
      const rectElements = subSlide.canvasElements.filter(
        (element): element is CanvasElementOfType<'rect'> =>
          element.type === 'rect'
      );
      const isSomeRectUsingCurrentColor = rectElements.some(
        (rectElement) => rectElement.fill === color
      );
      return !isSomeRectUsingCurrentColor;
    });
    if (colorsNotBeingUsed[0]) {
      textContainer.fill = colorsNotBeingUsed[0];
    }

    /* TODO: Export the base attributes from 'utils/generateSlides/text' and
    import here */
    const baseAttributes = {
      fontFamily: 'Arial',
      fontSize: 32,
      lineHeight: 1,
      letterSpacing: 0,
      fontStyle: '',
    };
    // Get the new font size, width and height
    const padding = 40;
    const { fontSize, width, height } = fitTextIntoRect(
      paragraph,
      baseAttributes,
      {
        width: textContainer.width! - padding * 2,
        height: textContainer.height! - padding * 2,
      }
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
      fill: chooseTextColor(
        textContainer.fill as (typeof rectColorPalette)[number]
      ),
    } satisfies CanvasElementOfType<'text'>;
    // Set the new text attributes
    Object.assign(textElement, textAttributes);

    return subSlide;
  });

  return [mainSlide, ...subSlides];
}

export async function generateSlide({
  title,
  paragraphs = [],
  asset,
}: {
  title: string;
  paragraphs?: string[];
  asset: { type: AssetType; url: string };
}) {
  const assetElement = await generateAssetAttributes(asset);

  let rectsAndTexts: CanvasElementOfType<'rect' | 'text'>[];

  const numberOfParagraphs = type('0 | 1 | 2').assert(paragraphs.length);

  const { titleRect, paragraphRects, extraRect } = generateRects({
    numberOfParagraphs: numberOfParagraphs,
    assetElement,
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

  return {
    canvasElements: [assetElement, ...rectsAndTexts],
    duration: 2,
  } satisfies Slide;
}

export async function generateSlides(presentationContent: PresentationContent) {
  // The only piece of text in the first slide will be the presentation title
  const firstSlide: Slide = await generateSlide({
    title: presentationContent.title,
    asset: presentationContent.asset,
  });

  const otherSlides: Slide[] = [];
  for (const slideContent of presentationContent.slides) {
    if (slideContent.paragraphs.length >= 3) {
      /* If the slide has 3 or more paragraphs, then it should be separated into
      sub-slides */
      const slideWithSubSlides = await generateSlideWithSubSlides(slideContent);
      otherSlides.push(...slideWithSubSlides);
      continue;
    }

    otherSlides.push(await generateSlide(slideContent));
  }

  return [firstSlide, ...otherSlides];
}
