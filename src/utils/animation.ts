import type { IRect } from 'konva/lib/types';

import { StageVirtualSize, defaultElementAttributes } from './konva';
import type { CanvasElement, CanvasElementOfType, JsUnion } from './types';

// function getIntersectionRect(firstShape: IRect, secondShape: IRect) {
//   const { leftMostShape, rightMostShape } =
//     firstShape.x <= secondShape.x
//       ? { leftMostShape: firstShape, rightMostShape: secondShape }
//       : { leftMostShape: secondShape, rightMostShape: firstShape };
//   const xDifference = rightMostShape.x - leftMostShape.x;
//   const intersectionWidth = leftMostShape.width - xDifference;

//   const { topMostShape, bottomMostShape } =
//     firstShape.y <= secondShape.y
//       ? { topMostShape: firstShape, bottomMostShape: secondShape }
//       : { topMostShape: secondShape, bottomMostShape: firstShape };
//   const yDifference = bottomMostShape.y - topMostShape.y;
//   const intersectionHeight = topMostShape.height - yDifference;

//   return { width: intersectionWidth, height: intersectionHeight };
// }

// function getIntersectionScore(firstShape: IRect, secondShape: IRect) {
//   const intersectionRect = getIntersectionRect(firstShape, secondShape);
//   const intersectionArea = intersectionRect.width * intersectionRect.height;

//   /* Calculate a score for each shape based on how much of the intersection area
//   covers the shape area */
//   const firstShapeIntersectionScore =
//     intersectionArea / (firstShape.width * firstShape.height);
//   const secondShapeIntersectionScore =
//     intersectionArea / (secondShape.width * secondShape.height);

//   // Calculate the mean of the scores
//   return (firstShapeIntersectionScore + secondShapeIntersectionScore) / 2;
// }

function getRectSizeScore(firstShape: IRect, secondShape: IRect) {
  const widthScore =
    firstShape.width > secondShape.width
      ? secondShape.width / firstShape.width
      : firstShape.width / secondShape.width;
  const heightScore =
    firstShape.height > secondShape.height
      ? secondShape.height / firstShape.height
      : firstShape.height / secondShape.height;

  // Calculate the mean of the scores
  return (widthScore + heightScore) / 2;
}

function getRectPositionScore(firstShape: IRect, secondShape: IRect) {
  const xDifference = Math.abs(firstShape.x - secondShape.x);
  const yDifference = Math.abs(firstShape.y - secondShape.y);

  const halfStageWidth = StageVirtualSize.width / 2;
  const halfStageHeight = StageVirtualSize.height / 2;

  // Note that these scores can be negative
  const xScore = 1 - xDifference / halfStageWidth;
  const yScore = 1 - yDifference / halfStageHeight;

  // Calculate the mean of the scores
  return (xScore + yScore) / 2;
}

export function getRectMorphScore(firstShape: IRect, secondShape: IRect) {
  const rectSizeScore = getRectSizeScore(firstShape, secondShape);
  const rectPositionScore = getRectPositionScore(firstShape, secondShape);

  // Calculate the mean of the scores
  return (rectSizeScore + rectPositionScore) / 2;
}

type RectWithMatches = {
  rect: CanvasElementOfType<'rect'>;
  matches: {
    rect: CanvasElementOfType<'rect'>;
    score: number;
  }[];
};

function getArrayOfRectsWithMatches(
  slide: CanvasElement[],
  nextSlide: CanvasElement[]
) {
  const arrayOfRectsWithMatches: RectWithMatches[] = [];

  slide.forEach((canvasElement) => {
    if (canvasElement.type !== 'rect') return;

    const canvasElementWithMatches: RectWithMatches = {
      rect: canvasElement,
      matches: [],
    };

    nextSlide.forEach((canvasElementOfNextSlide) => {
      if (canvasElementOfNextSlide.type !== 'rect') return;

      const score = getRectMorphScore(
        {
          x: canvasElement.x || 0,
          y: canvasElement.y || 0,
          width: canvasElement.width || 0,
          height: canvasElement.height || 0,
        },
        {
          x: canvasElementOfNextSlide.x || 0,
          y: canvasElementOfNextSlide.y || 0,
          width: canvasElementOfNextSlide.width || 0,
          height: canvasElementOfNextSlide.height || 0,
        }
      );

      canvasElementWithMatches.matches.push({
        rect: canvasElementOfNextSlide,
        score,
      });
    });

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
 * Sets the same ID for shapes that will be reused. **Does not mutate** the
 * array.
 */
export function setIdsForReusedShapes(slides: CanvasElement[][]) {
  const slidesCopy: CanvasElement[][] = slides.map((slide) => {
    return slide.map((canvasElement) => ({ ...canvasElement }));
  });

  slidesCopy.forEach((slide, slideIndex) => {
    const nextSlide = slidesCopy[slideIndex + 1];
    if (!nextSlide) return;

    const arrayOfRectsWithMatches = getArrayOfRectsWithMatches(
      slide,
      nextSlide
    );

    while (arrayOfRectsWithMatches.length > 0) {
      const rectWithMatches = arrayOfRectsWithMatches[0]!;

      // Remove the rect from the array and sort it again
      arrayOfRectsWithMatches.shift();
      sortArrayOfRectsWithMatchesFromBestToWorst(arrayOfRectsWithMatches);

      /* Filter out the shapes that are already being reused (i.e. shapes whose
      ID was already replaced with the ID of another element of the current
      slide) */
      const availableMatches = rectWithMatches.matches.filter((match) => {
        const shapeIsAlreadyBeingReused = slide.some(
          (canvasElement) => canvasElement.id === match.rect.id
        );
        return !shapeIsAlreadyBeingReused;
      });
      if (availableMatches.length === 0) continue;

      /* Set the best available match from the next slide to have the same ID as
      the current shape */
      const bestAvailableMatch = availableMatches[0]!;
      bestAvailableMatch.rect.id = rectWithMatches.rect.id;
    }
  });

  return slidesCopy;
}

type CombinedSlides = {
  canvasElement: CanvasElement;
  slideIndex: number;
  animations?: ({ duration: number; startTime: number } & JsUnion<
    { from: Record<string, string | number> },
    { to: Record<string, string | number> }
  >)[];
}[];

function addElementToCombinedSlides({
  canvasElement,
  canvasElementIndex,
  slide,
  slideIndex,
  combinedSlides,
}: {
  canvasElement: CanvasElement;
  canvasElementIndex: number;
  slide: CanvasElement[];
  slideIndex: number;
  combinedSlides: CombinedSlides;
}) {
  const elementsAfter = slide.slice(canvasElementIndex + 1);

  // First try adding the element before the closest element that's after it
  for (const otherCanvasElement of elementsAfter) {
    const indexFromCombinedSlides = combinedSlides.findIndex(
      ({ canvasElement: elementFromCombinedSlide }) => {
        return elementFromCombinedSlide.id === otherCanvasElement.id;
      }
    );
    const doesCombinedSlidesAlreadyIncludeCurrentElementId =
      indexFromCombinedSlides !== -1;

    if (doesCombinedSlidesAlreadyIncludeCurrentElementId) {
      combinedSlides.splice(indexFromCombinedSlides, 0, {
        canvasElement,
        slideIndex,
      });
      return;
    }
  }

  const reversedElementsBefore = slide.slice(0, canvasElementIndex).reverse();

  /* Then try adding the element after the closest element that's before it (the
  array is reversed so the array goes from closes to farthest element) */
  for (const otherCanvasElement of reversedElementsBefore) {
    const indexFromCombinedSlides = combinedSlides.findIndex(
      ({ canvasElement: elementFromCombinedSlide }) => {
        return elementFromCombinedSlide.id === otherCanvasElement.id;
      }
    );
    const doesCombinedSlidesAlreadyIncludeCurrentElementId =
      indexFromCombinedSlides !== -1;

    if (doesCombinedSlidesAlreadyIncludeCurrentElementId) {
      combinedSlides.splice(indexFromCombinedSlides + 1, 0, {
        canvasElement,
        slideIndex,
      });
      return;
    }
  }

  // Fallback to just adding the element to the end of the array
  combinedSlides.push({ canvasElement, slideIndex });
}

const SLIDE_DURATION = 1;
const COMPLETE_SLIDE_TRANSITION_DURATION = 0.5;
const FADE_ELEMENT_TRANSITION_DURATION = COMPLETE_SLIDE_TRANSITION_DURATION / 2;
const PRESENTATION_START_END_TRANSITION_DURATION =
  FADE_ELEMENT_TRANSITION_DURATION;

export function combineSlides(slides: CanvasElement[][]) {
  /* 3 slides example (considering the slide duration as 1s, the complete slide
  transition as 0.5s, and the first and last transitions as half the complete
  slide transition (0.25s) each):

  0.25s first transition -> 1s static -> 0.5s transition (morph should take 0.5,
  fade-in should take first 0.25s, fade-out should take last 0.25s) -> 1s static
  -> 0.5s transition -> 1s static -> 0.25s last transition */
  const combinedSlides: CombinedSlides = [];
  const slidesWithReusedIds = setIdsForReusedShapes(slides);

  for (const [slideIndex, slide] of slidesWithReusedIds.entries()) {
    for (const [canvasElementIndex, canvasElement] of slide.entries()) {
      const indexOfElementWithSameIdFromCombinedSlide =
        combinedSlides.findIndex(
          ({ canvasElement: elementFromCombinedSlide }) => {
            return elementFromCombinedSlide.id === canvasElement.id;
          }
        );
      const doesCombinedSlideAlreadyIncludeCurrentElementId =
        indexOfElementWithSameIdFromCombinedSlide !== -1;

      if (!doesCombinedSlideAlreadyIncludeCurrentElementId) {
        addElementToCombinedSlides({
          canvasElement,
          canvasElementIndex,
          slide,
          slideIndex,
          combinedSlides,
        });
        continue;
      }

      const elementFromCombinedSlide =
        combinedSlides[indexOfElementWithSameIdFromCombinedSlide]!;
      if (
        canvasElement.type !== 'rect' ||
        elementFromCombinedSlide.canvasElement.type !== 'rect'
      ) {
        throw new Error(
          "Element found with duplicate ID whose type is not 'rect'."
        );
      }

      elementFromCombinedSlide.animations ??= [];
      elementFromCombinedSlide.animations.push({
        to: {
          x: canvasElement.x || 0,
          y: canvasElement.y || 0,
          width: canvasElement.width || defaultElementAttributes.rect.width,
          height: canvasElement.height || defaultElementAttributes.rect.height,
          fill: canvasElement.fill || defaultElementAttributes.rect.fill,
          // TODO: Include other animatable attributes
        },
        duration: COMPLETE_SLIDE_TRANSITION_DURATION,
        startTime:
          PRESENTATION_START_END_TRANSITION_DURATION +
          SLIDE_DURATION * slideIndex +
          /* `slideIndex - 1` can never be negative because there will be no
          morph transition to the first slide (index 0), only to the second
          slide (index 1) and beyond */
          COMPLETE_SLIDE_TRANSITION_DURATION * (slideIndex - 1),
      });
    }
  }

  combinedSlides.forEach((item) => {
    const fadeInDown = {
      from: {
        y: (item.canvasElement.y || 0) + StageVirtualSize.height * 0.05,
        opacity: 0,
      },
      duration: FADE_ELEMENT_TRANSITION_DURATION,
      startTime:
        /* When it's from the first slide, the start time should be the start of
        the presentation (i.e. 0s). When it's from any other slide, the start
        time should be right after the non-reused elements of the previous slide
        finished fading out */
        item.slideIndex === 0
          ? 0
          : PRESENTATION_START_END_TRANSITION_DURATION +
            SLIDE_DURATION * item.slideIndex +
            COMPLETE_SLIDE_TRANSITION_DURATION * (item.slideIndex - 1) +
            FADE_ELEMENT_TRANSITION_DURATION,
    };
    const fadeOutUp = {
      to: {
        y: (item.canvasElement.y || 0) - StageVirtualSize.height * 0.05,
        opacity: 0,
      },
      duration: FADE_ELEMENT_TRANSITION_DURATION,
      startTime:
        PRESENTATION_START_END_TRANSITION_DURATION +
        SLIDE_DURATION * (item.slideIndex + 1) +
        COMPLETE_SLIDE_TRANSITION_DURATION * item.slideIndex,
    };

    /* Currently the length of `item.animations` will never be 0, but it's being
    checked just to be safe */
    if (!item.animations || item.animations.length === 0) {
      item.animations = [fadeInDown, fadeOutUp];
      return;
    }

    const lastMorphAnimation = item.animations[item.animations.length - 1]!;
    item.animations = [
      fadeInDown,
      ...item.animations,
      // This is also a fade-out up
      {
        to: {
          y:
            /* Since the element was morphed, using its original Y would
            probably move it to the incorrect position, therefore the Y of the
            last animation is being used */
            ((lastMorphAnimation.to?.y as number | undefined) || 0) -
            StageVirtualSize.height * 0.05,
          opacity: 0,
        },
        duration: FADE_ELEMENT_TRANSITION_DURATION,
        startTime:
          // This time represents the end of the last slide the shape is visible
          lastMorphAnimation.startTime +
          COMPLETE_SLIDE_TRANSITION_DURATION +
          SLIDE_DURATION,
      },
    ];
  });

  return combinedSlides;
}

/** Generates a random slide with three squares for testing purposes. */
export function _generateRandomSlide() {
  function randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  const colors = ['red', 'green', 'blue'];
  const slide: CanvasElementOfType<'rect'>[] = [];

  for (let i = 0; i < 3; i++) {
    const width = randomIntFromInterval(50, StageVirtualSize.width);
    const height = randomIntFromInterval(50, StageVirtualSize.height);
    const x = randomIntFromInterval(0, StageVirtualSize.width - width);
    const y = randomIntFromInterval(0, StageVirtualSize.height - height);

    slide.push({
      id: crypto.randomUUID(),
      type: 'rect',
      x,
      y,
      width,
      height,
      fill: colors[i],
    });
  }

  return slide;
}
