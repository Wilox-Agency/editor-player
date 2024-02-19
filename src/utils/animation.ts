import type { IRect } from 'konva/lib/types';

import { StageVirtualSize, defaultElementAttributes } from './konva';
import type { CanvasElement, CanvasElementOfType } from './types';
import { findLastIndex } from './array';

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
    canvasElementIndex: number;
  }[];
  canvasElementIndex: number;
};

function getArrayOfRectsWithMatches(
  slide: CanvasElement[],
  nextSlide: CanvasElement[]
) {
  const arrayOfRectsWithMatches: RectWithMatches[] = [];

  slide.forEach((canvasElement, canvasElementIndex) => {
    if (canvasElement.type !== 'rect') return;

    const canvasElementWithMatches: RectWithMatches = {
      rect: canvasElement,
      matches: [],
      canvasElementIndex,
    };

    nextSlide.forEach(
      (canvasElementOfNextSlide, indexOfCanvasElementOfNextSlide) => {
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
 * array.
 */
export function setSharedIdsForReusedShapes(slides: CanvasElement[][]) {
  const slidesCopy: (CanvasElement & { sharedId?: string })[][] = slides.map(
    (slide) => {
      return slide.map((canvasElement) => ({ ...canvasElement }));
    }
  );

  slidesCopy.forEach((slide, slideIndex) => {
    const nextSlide = slidesCopy[slideIndex + 1];
    if (!nextSlide) return;

    const arrayOfRectsWithMatches = getArrayOfRectsWithMatches(
      slide,
      nextSlide
    );

    while (arrayOfRectsWithMatches.length > 0) {
      const rectWithMatches = arrayOfRectsWithMatches[0]!;

      // Remove the rect from the array
      arrayOfRectsWithMatches.shift();

      if (rectWithMatches.matches.length === 0) continue;

      const currentRect = slide[rectWithMatches.canvasElementIndex]!;
      const bestAvailableMatch = rectWithMatches.matches[0]!;
      const sharedId = currentRect.sharedId || crypto.randomUUID();
      /* Set a shared ID to the current rect and its best available match from
      the next slide */
      currentRect.sharedId = sharedId;
      nextSlide[bestAvailableMatch.canvasElementIndex]!.sharedId = sharedId;

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

  return slidesCopy;
}

type CombinedSlides = {
  canvasElement: CanvasElement & { sharedId?: string };
  slideIndex: number;
  animations?: ({ duration: number; startTime: number } & Partial<{
    from: Record<string, string | number>;
    to: Record<string, string | number>;
  }>)[];
}[];

const SLIDE_DURATION = 1;
const COMPLETE_SLIDE_TRANSITION_DURATION = 1;
const MORPH_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 2;
const FADE_ELEMENT_TRANSITION_DURATION = COMPLETE_SLIDE_TRANSITION_DURATION / 4;
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
  const slidesWithSharedElementIds = setSharedIdsForReusedShapes(slides);

  for (const [slideIndex, slide] of slidesWithSharedElementIds.entries()) {
    for (const canvasElement of slide) {
      // Getting the index before adding the current canvas element to the array
      const indexOfElementToTransitionFrom = findLastIndex(
        combinedSlides,
        ({ canvasElement: elementFromCombinedSlides }) => {
          return elementFromCombinedSlides.sharedId === canvasElement.sharedId;
        }
      );

      combinedSlides.push({ canvasElement, slideIndex });

      if (!canvasElement.sharedId) continue;

      const hasElementToTransitionFrom = indexOfElementToTransitionFrom !== -1;
      if (!hasElementToTransitionFrom) continue;

      const elementToTransitionFrom =
        combinedSlides[indexOfElementToTransitionFrom]!;
      if (
        canvasElement.type !== 'rect' ||
        elementToTransitionFrom.canvasElement.type !== 'rect'
      ) {
        throw new Error(
          "Element found with shared ID whose type is not 'rect'."
        );
      }

      const currentElement = combinedSlides[combinedSlides.length - 1]!;

      const animationStartTime =
        PRESENTATION_START_END_TRANSITION_DURATION +
        SLIDE_DURATION * slideIndex +
        FADE_ELEMENT_TRANSITION_DURATION +
        /* `slideIndex - 1` can never be negative because there will be no morph
        transition to the first slide (index 0), only to the second slide (index
        1) and beyond */
        COMPLETE_SLIDE_TRANSITION_DURATION * (slideIndex - 1);

      // Make the previous element with same shared ID disappear
      elementToTransitionFrom.animations ??= [];
      elementToTransitionFrom.animations.push({
        // TODO: Test with `{ visible: false }`
        to: { opacity: 0 },
        duration: 0.000001,
        startTime: animationStartTime,
      });

      /* Make the current element morph from the previous one with same shared
      ID */
      currentElement.animations = [
        {
          // TODO: Test with `{ visible: false }`
          from: { opacity: 0 },
          duration: 0.000001,
          startTime: animationStartTime,
        },
        {
          from: {
            x: elementToTransitionFrom.canvasElement.x || 0,
            y: elementToTransitionFrom.canvasElement.y || 0,
            width:
              elementToTransitionFrom.canvasElement.width ||
              defaultElementAttributes.rect.width,
            height:
              elementToTransitionFrom.canvasElement.height ||
              defaultElementAttributes.rect.height,
            fill:
              elementToTransitionFrom.canvasElement.fill ||
              defaultElementAttributes.rect.fill,
            // TODO: Include other animatable attributes
          },
          duration: MORPH_ELEMENT_TRANSITION_DURATION,
          startTime: animationStartTime,
        },
      ];
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
            (FADE_ELEMENT_TRANSITION_DURATION +
              MORPH_ELEMENT_TRANSITION_DURATION),
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

    const firstAnimation = item.animations[0]!;
    const firstAnimationIsEnterAnimation = firstAnimation.from !== undefined;
    if (!firstAnimationIsEnterAnimation) {
      item.animations.unshift(fadeInDown);
    }

    const lastAnimation = item.animations[item.animations.length - 1]!;
    const lastAnimationIsExitAnimation = lastAnimation.to?.opacity === 0;

    // Add exit animation if the element doesn't have one yet
    if (!lastAnimationIsExitAnimation) {
      item.animations.push(fadeOutUp);
    }
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
