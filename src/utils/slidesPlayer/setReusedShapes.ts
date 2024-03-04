import deepEqual from 'fast-deep-equal';
import { excludeKeys, includeKeys } from 'filter-obj';

import { getRectMorphScore } from './rectMorphScore';
import { getCanvasElementRect } from './sizes';
import { assertType } from './assert';
import type { CanvasElementWithAnimationAttributes } from './sharedTypes';
import type {
  CanvasElement,
  CanvasElementAttribute,
  CanvasElementOfType,
  Slide,
} from '@/utils/types';

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
    const bestMatchScoreOfRectB = rectB.matches[0]?.score || -Infinity;

    /* If both of the best matches scores are `-Infinity`, then the subtration
    will result in `NaN`, so a fallback of 0 is being used */
    return bestMatchScoreOfRectB - bestMatchScoreOfRectA || 0;
  });
}

function removeFromAvailableMatches(
  arrayOfRectsWithMatches: RectWithMatches[],
  matchToRemove: RectWithMatches['matches'][number]
) {
  arrayOfRectsWithMatches.forEach((rect) => {
    rect.matches = rect.matches.filter(
      (match) => match.rect.id !== matchToRemove.rect.id
    );
  });
}

/**
 * Sets a shared ID for rects that will be reused with a morph animation.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function setSharedIdsForReusedRectsThatShouldMorph(
  slides: Slide<CanvasElementWithAnimationAttributes>[]
) {
  slides.forEach((slide, slideIndex) => {
    const nextSlide = slides[slideIndex + 1];
    if (!nextSlide) return;

    const arrayOfRectsWithMatches = getArrayOfRectsWithMatches(
      slide.canvasElements.map((element) => element.attributes),
      nextSlide.canvasElements.map((element) => element.attributes)
    );

    while (arrayOfRectsWithMatches.length > 0) {
      // Sort the array before getting the rect with best match
      sortArrayOfRectsWithMatchesFromBestToWorst(arrayOfRectsWithMatches);
      const rectWithMatches = arrayOfRectsWithMatches[0]!;
      // Remove the rect from the array
      arrayOfRectsWithMatches.shift();

      if (rectWithMatches.matches.length === 0) continue;

      const currentRect =
        slide.canvasElements[rectWithMatches.canvasElementIndex]!;

      // The element cannot already be shared with another one in the next slide
      const isCurrentRectAlreadySharedWithNextSlide =
        currentRect.animationAttributes.sharedWithNextSlide !== undefined;
      if (isCurrentRectAlreadySharedWithNextSlide) continue;

      const bestAvailableMatch = rectWithMatches.matches[0]!;
      /* There's a bug caused by TypeScript where, when I assert the type of
      `matchFromNextSlide` using `assertRect`, the type of the variable gets
      inferred as any, so it has to be manually typed */
      const matchFromNextSlide: CanvasElementWithAnimationAttributes =
        nextSlide.canvasElements[bestAvailableMatch.canvasElementIndex]!;

      /* The match cannot already be shared with another element in the current
      slide */
      const isMatchAlreadySharedWithCurrentSlide =
        matchFromNextSlide.animationAttributes.sharedWithPreviousSlide !==
        undefined;
      if (isMatchAlreadySharedWithCurrentSlide) {
        removeFromAvailableMatches(arrayOfRectsWithMatches, bestAvailableMatch);
        continue;
      }

      // Asserting that their types are correct
      assertType(currentRect, 'rect');
      assertType(matchFromNextSlide, 'rect');

      const sharedId = crypto.randomUUID();
      /* Set a shared ID to the current rect and its best available match from
      the next slide */
      currentRect.animationAttributes.sharedWithNextSlide = {
        sharedId,
        animationType: 'morph',
      };
      matchFromNextSlide.animationAttributes.sharedWithPreviousSlide = {
        sharedId,
        animationType: 'morph',
      };

      /* Remove the best available match of the current rect from the `matches`
      array of the remaining rects since it's now already being used */
      removeFromAvailableMatches(arrayOfRectsWithMatches, bestAvailableMatch);
    }
  });

  return slides;
}

function compareElements(
  elementA: Record<PropertyKey, unknown>,
  elementB: Record<PropertyKey, unknown>,
  {
    comparisonType,
  }: {
    /**
     * `'exactlyEqual'` compares if all attributes, except `id`, are equal.
     *
     * `'sameShapeAndPosition'` compares if `x`, `y`, `width`, `height`,
     * `cornerRadius` and `rotation` are equal, except if any of the elements is
     * a text one, which will always cause the function to return false.
     */
    comparisonType: 'exactlyEqual' | 'sameShapeAndPosition';
  }
) {
  if (comparisonType === 'exactlyEqual') {
    return deepEqual(
      excludeKeys(elementA, ['id']),
      excludeKeys(elementB, ['id'])
    );
  }

  /* When comparing only shape and position, text elements should never be
  considered */
  const anyOfTheElementsIsText =
    elementA.type === 'text' || elementB.type === 'text';
  if (comparisonType === 'sameShapeAndPosition' && anyOfTheElementsIsText) {
    return false;
  }

  const attributesToCompare: CanvasElementAttribute[] = [
    'x',
    'y',
    'width',
    'height',
    'cornerRadius',
    'rotation',
  ];
  return deepEqual(
    includeKeys(elementA, attributesToCompare),
    includeKeys(elementB, attributesToCompare)
  );
}

/**
 * Sets a shared ID for elements that will be reused with no animation or with a
 * slide-in animation.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function setSharedIdsForReusedElements(
  slides: Slide<CanvasElementWithAnimationAttributes>[]
) {
  for (const [slideIndex, slide] of slides.entries()) {
    const nextSlide = slides[slideIndex + 1];

    // Look for exactly equal element
    for (const element of slide.canvasElements) {
      const exactlyEqualElementInNextSlide = nextSlide?.canvasElements.find(
        (elementFromNextSlide) => {
          return compareElements(
            element.attributes,
            elementFromNextSlide.attributes,
            { comparisonType: 'exactlyEqual' }
          );
        }
      );

      if (
        exactlyEqualElementInNextSlide &&
        /* The exactly equal element cannot already be shared with another one
        in the current slide */
        exactlyEqualElementInNextSlide.animationAttributes
          .sharedWithPreviousSlide === undefined
      ) {
        const sharedId = crypto.randomUUID();

        element.animationAttributes.sharedWithNextSlide = {
          sharedId,
          animationType: 'none',
        };
        exactlyEqualElementInNextSlide.animationAttributes.sharedWithPreviousSlide =
          { sharedId, animationType: 'none' };
      }
    }

    // Then, look for an element with same shape and position...
    for (const element of slide.canvasElements) {
      /* ...but only if the current element is not already shared with the next
      slide */
      const isAlreadySharedWithNextSlide =
        element.animationAttributes.sharedWithNextSlide !== undefined;
      if (isAlreadySharedWithNextSlide) continue;

      const elementWithSameShapeAndPositionInNextSlide =
        nextSlide?.canvasElements.find((elementFromNextSlide) => {
          return compareElements(
            element.attributes,
            elementFromNextSlide.attributes,
            { comparisonType: 'sameShapeAndPosition' }
          );
        });

      if (
        elementWithSameShapeAndPositionInNextSlide &&
        /* The element with same shape and position cannot already be shared
        with another one in the current slide */
        elementWithSameShapeAndPositionInNextSlide.animationAttributes
          .sharedWithPreviousSlide === undefined
      ) {
        const sharedId = crypto.randomUUID();

        element.animationAttributes.sharedWithNextSlide = {
          sharedId,
          animationType: 'slideIn',
        };
        elementWithSameShapeAndPositionInNextSlide.animationAttributes.sharedWithPreviousSlide =
          { sharedId, animationType: 'slideIn' };
      }
    }
  }

  return slides;
}
