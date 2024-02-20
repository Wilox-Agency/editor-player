import Konva from 'konva';
import type { IRect } from 'konva/lib/types';
import gsap from 'gsap';

import { StageVirtualSize, defaultElementAttributes } from './konva';
import { findLastIndex } from './array';
import type { CanvasElement, CanvasElementOfType, Slide } from './types';

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

function getTextHeight(canvasTextElement: CanvasElementOfType<'text'>) {
  const textNode = new Konva.Text(canvasTextElement);
  /* TODO: Test if the height is calculated immediately or I need to wait until
  it is calculated */
  return textNode.height();
}

function getCanvasElementRect(canvasElement: CanvasElement) {
  return {
    x: canvasElement.x || 0,
    y: canvasElement.y || 0,
    width: canvasElement.width || 0,
    height:
      canvasElement.type === 'text'
        ? getTextHeight(canvasElement)
        : canvasElement.height || 0,
  };
}

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

type CanvasElementWithSharedId = CanvasElement & { sharedId?: string };

/**
 * Sets a shared ID for shapes that will be reused. **Does not mutate** the
 * array.
 */
export function setSharedIdsForReusedShapes(slides: Slide[]) {
  const slidesCopy: Slide<CanvasElementWithSharedId>[] = slides.map((slide) => {
    return {
      ...slide,
      canvasElements: slide.canvasElements.map((canvasElement) => ({
        ...canvasElement,
      })),
    };
  });

  slidesCopy.forEach((slide, slideIndex) => {
    const nextSlide = slidesCopy[slideIndex + 1];
    if (!nextSlide) return;

    const arrayOfRectsWithMatches = getArrayOfRectsWithMatches(
      slide.canvasElements,
      nextSlide.canvasElements
    );

    while (arrayOfRectsWithMatches.length > 0) {
      const rectWithMatches = arrayOfRectsWithMatches[0]!;

      // Remove the rect from the array
      arrayOfRectsWithMatches.shift();

      if (rectWithMatches.matches.length === 0) continue;

      const currentRect =
        slide.canvasElements[rectWithMatches.canvasElementIndex]!;
      const bestAvailableMatch = rectWithMatches.matches[0]!;
      const sharedId = currentRect.sharedId || crypto.randomUUID();
      /* Set a shared ID to the current rect and its best available match from
      the next slide */
      currentRect.sharedId = sharedId;
      nextSlide.canvasElements[
        bestAvailableMatch.canvasElementIndex
      ]!.sharedId = sharedId;

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

type CanvasElementWithSharedIdAndEnterDelay = CanvasElementWithSharedId & {
  enterDelay?: number;
};

function setElementsEnterDelays(slides: Slide<CanvasElementWithSharedId>[]) {
  type NonTextElement = Extract<
    CanvasElementWithSharedIdAndEnterDelay,
    { type: Exclude<CanvasElement['type'], 'text'> }
  >;

  const BASE_DELAY = 0.1;

  const slidesCopy: Slide<CanvasElementWithSharedIdAndEnterDelay>[] =
    slides.map((slide) => {
      return {
        ...slide,
        canvasElements: slide.canvasElements.map((canvasElement) => ({
          ...canvasElement,
        })),
      };
    });

  slidesCopy.forEach((slide, slideIndex) => {
    const previousSlide = slidesCopy[slideIndex - 1];

    slide.canvasElements
      /* Get only the elements that will have an entering animation whose type
      is not 'text' */
      .filter((canvasElement): canvasElement is NonTextElement => {
        /* If an element from the previous slide has the same shared ID, it
        means the current element will morph from it */
        const elementWillMorphFromOtherElement =
          canvasElement.sharedId &&
          previousSlide?.canvasElements.some(
            (canvasElementFromPreviousSlide) => {
              return (
                canvasElementFromPreviousSlide.sharedId ===
                canvasElement.sharedId
              );
            }
          );

        const elementWillHaveEnteringAnimation =
          !elementWillMorphFromOtherElement;
        const isText = canvasElement.type === 'text';

        return elementWillHaveEnteringAnimation && !isText;
      })
      // Sort from largest to smallest area
      .sort((elementA, elementB) => {
        const areaOfElementA = (elementA.width || 0) * (elementA.height || 0);
        const areaOfElementB = (elementB.width || 0) * (elementB.height || 0);
        return areaOfElementB - areaOfElementA;
      })
      /* Set the enter delay based on the index (the smaller the element, the
      longer the delay, but scaling with the order, not the area) */
      .forEach((canvasElement, elementIndex) => {
        canvasElement.enterDelay = BASE_DELAY * elementIndex;
      });
  });

  return slidesCopy;
}

function getSumOfDurationOfSlidesUntilNow(
  slides: Slide[],
  currentSlideIndex: number
) {
  const sumOfDurationOfSlidesUntilNow = slides
    .slice(0, currentSlideIndex)
    .reduce((accumulator, slide) => accumulator + slide.duration, 0);
  return sumOfDurationOfSlidesUntilNow;
}

function getElementSideClosestToStageEdge(elementRect: IRect) {
  const sideDistances = {
    left: Math.max(elementRect.x, 0),
    right: Math.max(
      StageVirtualSize.width - (elementRect.x + elementRect.width),
      0
    ),
    top: Math.max(elementRect.y, 0),
    bottom: Math.max(
      StageVirtualSize.height - (elementRect.y + elementRect.height)
    ),
  } as const;

  let sideClosestToStageEdge: keyof typeof sideDistances = 'left';
  for (const untypedSide in sideDistances) {
    const side = untypedSide as keyof typeof sideDistances;

    if (sideDistances[side] < sideDistances[sideClosestToStageEdge]) {
      sideClosestToStageEdge = side;
    }
  }

  return sideClosestToStageEdge;
}

type AnimationStates = Partial<{
  from: Record<string, string | number>;
  to: Record<string, string | number>;
}>;

type Animation = {
  type: 'morph' | 'enter' | 'exit' | 'appear' | 'disappear';
  duration: number;
  startTime: number;
  groupAnimation?: AnimationStates;
  nodeAnimation?: AnimationStates;
};

/**
 * Some animations don't work properly if their duration is exactly 0,
 * therefore, a decimal close to 0 is used instead.
 */
const ALMOST_ZERO_DURATION = 0.001;

function getEnterExitAnimations({
  canvasElement,
  duration,
  enterStartTime,
  exitStartTime,
}: {
  canvasElement: CanvasElement;
  duration: number;
  enterStartTime: number;
  exitStartTime: number;
}) {
  const elementRect = getCanvasElementRect(canvasElement);
  const sideClosestToStageEdge = getElementSideClosestToStageEdge(elementRect);

  const animationsVarsByDirection = {
    left: {
      invisible: { clipWidth: 0 },
      visible: { clipWidth: elementRect.width },
    },
    right: {
      invisible: { clipX: elementRect.width, clipWidth: 0 },
      visible: { clipX: 0, clipWidth: elementRect.width },
    },
    top: {
      invisible: { clipHeight: 0 },
      visible: { clipHeight: elementRect.height },
    },
    bottom: {
      invisible: { clipY: elementRect.height, clipHeight: 0 },
      visible: { clipY: 0, clipHeight: elementRect.height },
    },
  } satisfies Record<
    typeof sideClosestToStageEdge,
    {
      invisible: Record<string, number>;
      visible: Record<string, number>;
    }
  >;

  const animationVars = animationsVarsByDirection[sideClosestToStageEdge];

  const enterAnimations: Animation[] = [
    {
      type: 'appear',
      groupAnimation: { from: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: enterStartTime,
    },
    {
      type: 'enter',
      groupAnimation: {
        from: animationVars.invisible,
        to: animationVars.visible,
      },
      duration,
      startTime: enterStartTime,
    },
  ];

  const exitAnimations: Animation[] = [
    {
      type: 'exit',
      groupAnimation: {
        from: animationVars.visible,
        to: animationVars.invisible,
      },
      duration,
      startTime: exitStartTime,
    },
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: exitStartTime + duration - ALMOST_ZERO_DURATION,
    },
  ];

  return { enterAnimations, exitAnimations };
}

type CombinedSlides = {
  canvasElement: CanvasElementWithSharedIdAndEnterDelay;
  slideIndex: number;
  animations?: Animation[];
}[];

const COMPLETE_SLIDE_TRANSITION_DURATION = 2;
const MORPH_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 2;
const FADE_ELEMENT_TRANSITION_DURATION = COMPLETE_SLIDE_TRANSITION_DURATION / 4;
const PRESENTATION_START_END_TRANSITION_DURATION =
  FADE_ELEMENT_TRANSITION_DURATION;

export function combineSlides(slides: Slide[]) {
  /* 3 slides example (considering the complete slide transition as 1s, the
  morph transition as half the complete slide transition (0.5s), and the fade
  transitions as one-fourth the complete slide transition (0.25s) each):

  0.25s first transition (fade-in) -> first slide duration -> 1s transition
  (0.25s fade-out -> 0.5s morph -> 0.25s fade-in) -> second slide duration -> 1s
  transition -> third slide duration -> 0.25s last transition (fade-out) */
  const combinedSlides: CombinedSlides = [];
  const slidesWithSharedElementIds = setSharedIdsForReusedShapes(slides);
  const slidesWithSharedElementIdsAndElementEnterDelays =
    setElementsEnterDelays(slidesWithSharedElementIds);

  for (const [
    slideIndex,
    slide,
  ] of slidesWithSharedElementIdsAndElementEnterDelays.entries()) {
    for (const canvasElement of slide.canvasElements) {
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

      const sumOfDurationOfSlidesUntilNow = getSumOfDurationOfSlidesUntilNow(
        slidesWithSharedElementIds,
        slideIndex
      );
      const animationStartTime =
        PRESENTATION_START_END_TRANSITION_DURATION +
        sumOfDurationOfSlidesUntilNow +
        FADE_ELEMENT_TRANSITION_DURATION +
        /* `slideIndex - 1` can never be negative because there will be no morph
        transition to the first slide (index 0), only to the second slide (index
        1) and beyond */
        COMPLETE_SLIDE_TRANSITION_DURATION * (slideIndex - 1);

      // Make the previous element with same shared ID disappear
      elementToTransitionFrom.animations ??= [];
      elementToTransitionFrom.animations.push({
        type: 'disappear',
        groupAnimation: { to: { opacity: 0 } },
        duration: ALMOST_ZERO_DURATION,
        startTime: animationStartTime,
      });

      /* Make the current element morph from the previous one with same shared
      ID */
      currentElement.animations = [
        {
          type: 'appear',
          groupAnimation: { from: { opacity: 0 } },
          duration: ALMOST_ZERO_DURATION,
          startTime: animationStartTime,
        },
        {
          type: 'morph',
          groupAnimation: {
            from: {
              x: elementToTransitionFrom.canvasElement.x || 0,
              y: elementToTransitionFrom.canvasElement.y || 0,
              clipWidth:
                elementToTransitionFrom.canvasElement.width ||
                defaultElementAttributes.rect.width,
              clipHeight:
                elementToTransitionFrom.canvasElement.height ||
                defaultElementAttributes.rect.height,
            },
          },
          nodeAnimation: {
            from: {
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
          },
          duration: MORPH_ELEMENT_TRANSITION_DURATION,
          startTime: animationStartTime,
        },
      ];
    }
  }

  combinedSlides.forEach((item) => {
    const sumOfDurationOfSlidesUntilNow = getSumOfDurationOfSlidesUntilNow(
      slidesWithSharedElementIds,
      item.slideIndex
    );
    const currentSlideDuration =
      slidesWithSharedElementIds[item.slideIndex]!.duration;

    const { enterAnimations, exitAnimations } = getEnterExitAnimations({
      canvasElement: item.canvasElement,
      enterStartTime:
        /* When it's from the first slide, the start time should be only the
        element's enter delay. When it's from any other slide, the start time
        should be right after the morph element transition of the reused
        elements plus the element's enter delay */
        item.slideIndex === 0
          ? item.canvasElement.enterDelay || 0
          : PRESENTATION_START_END_TRANSITION_DURATION +
            sumOfDurationOfSlidesUntilNow +
            COMPLETE_SLIDE_TRANSITION_DURATION * (item.slideIndex - 1) +
            (FADE_ELEMENT_TRANSITION_DURATION +
              MORPH_ELEMENT_TRANSITION_DURATION) +
            (item.canvasElement.enterDelay || 0),
      exitStartTime:
        PRESENTATION_START_END_TRANSITION_DURATION +
        (sumOfDurationOfSlidesUntilNow + currentSlideDuration) +
        COMPLETE_SLIDE_TRANSITION_DURATION * item.slideIndex,
      duration: FADE_ELEMENT_TRANSITION_DURATION,
    });

    /* Currently the length of `item.animations` will never be 0, but it's being
    checked just to be safe */
    if (!item.animations || item.animations.length === 0) {
      item.animations = [...enterAnimations, ...exitAnimations];
      return;
    }

    const firstAnimation = item.animations[0]!;
    const firstAnimationIsAppearAnimation = firstAnimation.type === 'appear';

    // Add enter animations if the element doesn't have yet
    if (!firstAnimationIsAppearAnimation) {
      item.animations.unshift(...enterAnimations);
    }

    const lastAnimation = item.animations[item.animations.length - 1]!;
    const lastAnimationIsDisappearAnimation =
      lastAnimation.type === 'disappear';

    // Add exit animations if the element doesn't have yet
    if (!lastAnimationIsDisappearAnimation) {
      item.animations.push(...exitAnimations);
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

function createTween({
  target,
  animationStates,
  duration,
}: {
  target: Konva.Node;
  animationStates: AnimationStates;
  duration: number;
}) {
  if (animationStates.from && animationStates.to) {
    return gsap.fromTo(
      target,
      { ...animationStates.from, duration },
      { ...animationStates.to, duration }
    );
  }

  if (animationStates.from) {
    return gsap.from(target, { ...animationStates.from, duration });
  }

  if (animationStates.to) {
    return gsap.to(target, { ...animationStates.to, duration });
  }

  throw new Error(
    'Both `animationStates.from` an `animationStates.to` are undefined'
  );
}

export function createTweens({
  animation,
  group,
  node,
}: {
  animation: Animation;
  group: Konva.Group;
  node: Konva.Node;
}) {
  let groupTween: gsap.core.Tween | undefined = undefined;
  let nodeTween: gsap.core.Tween | undefined = undefined;

  if (animation.groupAnimation) {
    groupTween = createTween({
      target: group,
      animationStates: animation.groupAnimation,
      duration: animation.duration,
    });
  }

  if (animation.nodeAnimation) {
    nodeTween = createTween({
      target: node,
      animationStates: animation.nodeAnimation,
      duration: animation.duration,
    });
  }

  return { groupTween, nodeTween };
}
