import { type } from 'arktype';

import { type AssetType, generateAssetAttributes } from './asset';
import { generateRects } from './rect';
import { generateTextAttributes } from './text';
import { StageVirtualSize } from '@/utils/konva';
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

  const isFullWidthAsset = assetElement.width === StageVirtualSize.width;
  const isFullHeightAsset = assetElement.height === StageVirtualSize.height;
  if (!isFullWidthAsset && !isFullHeightAsset) {
    throw new Error(
      'Only asset elements that are full width or full height are currently supported.'
    );
  }

  let rectsAndTexts: CanvasElementOfType<'rect' | 'text'>[];

  const numberOfParagraphs = paragraphs.length;
  const hasLessThan3Paragraphs = type('0 | 1 | 2').allows(numberOfParagraphs);

  if (hasLessThan3Paragraphs) {
    const { titleRect, paragraphRects, extraRect } = generateRects({
      mainDimension: isFullWidthAsset ? 'width' : 'height',
      numberOfParagraphs,
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
  } else {
    // Should create slide with subslides
    throw new Error(
      'Generating subslides are not supported yet (happens when slide has 3+ paragraphs).'
    );
  }

  rectsAndTexts ??= [];
  console.log(rectsAndTexts);

  return {
    canvasElements: [assetElement, ...rectsAndTexts],
    duration: 2,
  } satisfies Slide;
}

export async function generateSlides(presentationContent: PresentationContent) {
  // The only piece of text in the first slide will be the presentation title
  const firstSlide = await generateSlide({
    title: presentationContent.title,
    asset: presentationContent.asset,
  });

  const otherSlides = presentationContent.slides.map((slide) => {
    return generateSlide(slide);
  });

  return [firstSlide, ...otherSlides];
}
