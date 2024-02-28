import { getRectMorphScore } from './rectMorphScore';
import { getCanvasElementRect } from './sizes';
import { assertType } from './assert';
import type { CanvasElementWithAnimationAttributes } from './sharedTypes';
import type { CanvasElement, CanvasElementOfType, Slide } from '@/utils/types';

type RectWithMatches = {
  rect: CanvasElementOfType<'rect'>;
  matches: {
    rect: CanvasElementOfType<'rect'>;
    score: number;
    canvasElementIndex: number;
  }[];
  canvasElementIndex: number;
};

function getArrayOfRectsWithMatches(
  slideElements: CanvasElement[],
  nextSlideElements: CanvasElement[]
) {
  const arrayOfRectsWithMatches: RectWithMatches[] = [];

  slideElements.forEach((canvasElement, canvasElementIndex) => {
    if (canvasElement.type !== 'rect') return;

    const canvasElementWithMatches: RectWithMatches = {
      rect: canvasElement,
      matches: [],
      canvasElementIndex,
    };

    nextSlideElements.forEach(
      (canvasElementOfNextSlide, indexOfCanvasElementOfNextSlide) => {
        if (canvasElementOfNextSlide.type !== 'rect') return;

        const score = getRectMorphScore(
          getCanvasElementRect(canvasElement),
          getCanvasElementRect(canvasElementOfNextSlide)
        );

        canvasElementWithMatches.matches.push({
          rect: canvasElementOfNextSlide,
          score,
          canvasElementIndex: indexOfCanvasElementOfNextSlide,
        });
      }
    );

    // Sort from best to worst
    canvasElementWithMatches.matches.sort((a, b) => b.score - a.score);

    arrayOfRectsWithMatches.push(canvasElementWithMatches);
  });

  return arrayOfRectsWithMatches;
}

/**
 * Sorts the provided array using the best match (considering the matches array
 * of every rect is in descending order) of each rect, **mutating** the array in
 * the process.
 */
function sortArrayOfRectsWithMatchesFromBestToWorst(
  arrayOfRectsWithMatches: RectWithMatches[]
) {
  // Sort from best to worst
  arrayOfRectsWithMatches.sort((rectA, rectB) => {
    const bestMatchScoreOfRectA = rectA.matches[0]?.score || -Infinity;
    const bestMatchScoresOfRectB = rectB.matches[0]?.score || -Infinity;

    /* If both of the best matches scores are `-Infinity`, then the subtration
    will result in `NaN`, so a fallback of 0 is being used */
    return bestMatchScoreOfRectA - bestMatchScoresOfRectB || 0;
  });
}

/**
 * Sets a shared ID for shapes that will be reused. **Does not mutate** the
 * array nor its elements.
 */
export function setSharedIdsForReusedShapes(slides: Slide[]) {
  const slidesWithElementAnimationAttributes: Slide<CanvasElementWithAnimationAttributes>[] =
    slides.map((slide) => {
      return {
        ...slide,
        canvasElements: slide.canvasElements.map((canvasElement) => {
          return {
            attributes: { ...canvasElement },
            animationAttributes: {},
          } as CanvasElementWithAnimationAttributes;
        }),
      };
    });

  slidesWithElementAnimationAttributes.forEach((slide, slideIndex) => {
    const nextSlide = slidesWithElementAnimationAttributes[slideIndex + 1];
    if (!nextSlide) return;

    const arrayOfRectsWithMatches = getArrayOfRectsWithMatches(
      // Using the original slides array so the elements have the correct format
      slides[slideIndex]!.canvasElements,
      slides[slideIndex + 1]!.canvasElements
    );

    while (arrayOfRectsWithMatches.length > 0) {
      const rectWithMatches = arrayOfRectsWithMatches[0]!;

      // Remove the rect from the array
      arrayOfRectsWithMatches.shift();

      if (rectWithMatches.matches.length === 0) continue;

      const currentRect =
        slide.canvasElements[rectWithMatches.canvasElementIndex]!;
      const bestAvailableMatch = rectWithMatches.matches[0]!;
      /* There's a bug caused by TypeScript where, when I assert the type of
      `matchFromNextSlide` using `assertRect`, the type of the variable gets
      inferred as any, so it has to be manually typed */
      const matchFromNextSlide: CanvasElementWithAnimationAttributes =
        nextSlide.canvasElements[bestAvailableMatch.canvasElementIndex]!;

      // Asserting that their types are correct
      assertType(currentRect, 'rect');
      assertType(matchFromNextSlide, 'rect');

      const sharedId =
        currentRect.animationAttributes.sharedId || crypto.randomUUID();
      /* Set a shared ID to the current rect and its best available match from
      the next slide */
      currentRect.animationAttributes.sharedId = sharedId;
      matchFromNextSlide.animationAttributes.sharedId = sharedId;

      /* Remove the best available match of the current rect from the `matches`
      array of the remaining rect since it's now already being used */
      arrayOfRectsWithMatches.forEach((rect) => {
        rect.matches = rect.matches.filter(
          (match) => match.rect.id !== bestAvailableMatch.rect.id
        );
      });
      // Sort the array again
      sortArrayOfRectsWithMatchesFromBestToWorst(arrayOfRectsWithMatches);
    }
  });

  return slidesWithElementAnimationAttributes;
}
