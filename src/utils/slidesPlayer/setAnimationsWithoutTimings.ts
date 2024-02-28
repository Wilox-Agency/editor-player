import type { IRect } from 'konva/lib/types';
import deepEqual from 'fast-deep-equal';
import { excludeKeys } from 'filter-obj';

import { getCanvasElementRect } from './sizes';
import type {
  AnimationWithoutTimings,
  CanvasElementWithAnimationAttributes,
  CanvasElementWithAnimationsWithoutTimings,
} from './sharedTypes';
import { StageVirtualSize, defaultElementAttributes } from '@/utils/konva';
import { pipe } from '@/utils/pipe';
import { assertType } from './assert';

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

function getSideToAnimateEnterExitAnimationsFrom({
  canvasElement,
  slideElements,
}: {
  canvasElement: CanvasElementWithAnimationAttributes;
  slideElements: CanvasElementWithAnimationAttributes[];
}) {
  const elementRect = getCanvasElementRect(canvasElement.attributes);

  let sideToAnimateFrom;
  if (
    canvasElement.attributes.type === 'text' &&
    canvasElement.animationAttributes.containerId !== undefined
  ) {
    const textContainer = slideElements.find((otherElement) => {
      return (
        otherElement.attributes.id ===
        canvasElement.animationAttributes.containerId
      );
    });
    if (textContainer) {
      /* TODO: If a new method of deciding the side an element animates from when
      entering/exiting is added, instead of using
      `getElementSideClosestToStageEdge` to get the side the text container is
      animating from, get directly by the side that was decided previously */
      sideToAnimateFrom = pipe(
        textContainer.attributes,
        getCanvasElementRect,
        getElementSideClosestToStageEdge
      );
    }
  }
  sideToAnimateFrom ??= getElementSideClosestToStageEdge(elementRect);

  return sideToAnimateFrom;
}

/**
 * Both `clipWidth` and `clipHeight` attributes of `Konva.Group` are ignored if
 * any of their values are exactly 0, therefore a decimal close to 0 is used
 * instead.
 */
const ALMOST_ZERO_CLIP_SIZE = 0.001;

function getEnterExitAnimationVars({
  element,
  slide,
}: {
  element: CanvasElementWithAnimationsWithoutTimings;
  slide: { canvasElements: CanvasElementWithAnimationsWithoutTimings[] };
}) {
  const sideToAnimateFrom = getSideToAnimateEnterExitAnimationsFrom({
    canvasElement: element,
    slideElements: slide.canvasElements,
  });

  const elementRect = getCanvasElementRect(element.attributes);
  const animationsVarsByDirection = {
    left: {
      invisible: { clipWidth: ALMOST_ZERO_CLIP_SIZE },
      visible: { clipWidth: elementRect.width },
    },
    right: {
      invisible: { clipX: elementRect.width, clipWidth: ALMOST_ZERO_CLIP_SIZE },
      visible: { clipX: 0, clipWidth: elementRect.width },
    },
    top: {
      invisible: { clipHeight: ALMOST_ZERO_CLIP_SIZE },
      visible: { clipHeight: elementRect.height },
    },
    bottom: {
      invisible: {
        clipY: elementRect.height,
        clipHeight: ALMOST_ZERO_CLIP_SIZE,
      },
      visible: { clipY: 0, clipHeight: elementRect.height },
    },
  } satisfies Record<
    typeof sideToAnimateFrom,
    { invisible: Record<string, number>; visible: Record<string, number> }
  >;
  const animationVars = animationsVarsByDirection[sideToAnimateFrom];

  return animationVars;
}

function compareElements(
  elementA: Record<PropertyKey, unknown>,
  elementB: Record<PropertyKey, unknown>
) {
  return deepEqual(
    excludeKeys(elementA, ['id']),
    excludeKeys(elementB, ['id'])
  );
}

/**
 * @returns A boolean representing if a rect element from the next slide will
 * morph from the provided element (i.e. will be "reused" in the next slide).
 */
function getRectElementWillBeReusedInNextSlide(
  element: CanvasElementWithAnimationsWithoutTimings,
  nextSlide:
    | { canvasElements: CanvasElementWithAnimationsWithoutTimings[] }
    | undefined
) {
  if (element.animationAttributes.sharedId === undefined || !nextSlide) {
    return false;
  }

  return nextSlide.canvasElements.some((elementFromNextSlide) => {
    return (
      elementFromNextSlide.animationAttributes.sharedId ===
      element.animationAttributes.sharedId
    );
  });
}

export function setEnterAnimationWithoutTimings({
  element,
  slide,
  previousSlide,
}: {
  element: CanvasElementWithAnimationsWithoutTimings;
  slide: { canvasElements: CanvasElementWithAnimationsWithoutTimings[] };
  previousSlide:
    | { canvasElements: CanvasElementWithAnimationsWithoutTimings[] }
    | undefined;
}) {
  element.animations ??= [];

  /* If the element already has an appear animation, do not add an enter
  animation */
  const alreadyHasAppearAnimation = element.animations.some(
    (animation) => animation.type === 'morphAppear'
  );
  if (alreadyHasAppearAnimation) return;

  const previousSlideHasExactlyEqualElement =
    previousSlide?.canvasElements.some(
      ({ attributes: elementFromPreviousSlide }) => {
        return compareElements(element.attributes, elementFromPreviousSlide);
      }
    );

  const animationVars = getEnterExitAnimationVars({ element, slide });

  const animations: AnimationWithoutTimings[] = [
    {
      type: 'appear',
      groupAnimation: { from: { opacity: 0 } },
    },
  ];

  /* Only add enter animation if there's no element in the previous slide that
  is exactly equal to the current element */
  if (!previousSlideHasExactlyEqualElement) {
    animations.push({
      type: 'enter',
      groupAnimation: {
        from: animationVars.invisible,
        to: animationVars.visible,
      },
    });
  }

  element.animations.push(...animations);
}

export function setExitAnimationWithoutTimings({
  element,
  slide,
  nextSlide,
}: {
  element: CanvasElementWithAnimationsWithoutTimings;
  slide: { canvasElements: CanvasElementWithAnimationsWithoutTimings[] };
  nextSlide:
    | { canvasElements: CanvasElementWithAnimationsWithoutTimings[] }
    | undefined;
}) {
  element.animations ??= [];

  const elementWillBeReusedInNextSlide = getRectElementWillBeReusedInNextSlide(
    element,
    nextSlide
  );
  if (elementWillBeReusedInNextSlide) return;

  /* If the element already has an disappear animation, do not add an enter
  animation */
  const alreadyHasDisappearAnimation = element.animations.some(
    (animation) => animation.type === 'disappear'
  );
  if (alreadyHasDisappearAnimation) return;

  const nextSlideHasExactlyEqualElement = nextSlide?.canvasElements.some(
    ({ attributes: elementFromNextSlide }) => {
      return compareElements(element.attributes, elementFromNextSlide);
    }
  );

  const animationVars = getEnterExitAnimationVars({ element, slide });

  const animations: AnimationWithoutTimings[] = [
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
    },
  ];
  /* Only add exit animation if there's no element in the next slide that
  is exactly equal to the current element */
  if (!nextSlideHasExactlyEqualElement) {
    animations.push({
      type: 'exit',
      groupAnimation: {
        from: animationVars.visible,
        to: animationVars.invisible,
      },
    });
  }

  element.animations.push(...animations);
}

export function setRectMorphAnimationsWithoutTimings({
  element,
  nextSlide,
}: {
  element: CanvasElementWithAnimationsWithoutTimings;
  nextSlide: { canvasElements: CanvasElementWithAnimationsWithoutTimings[] };
}) {
  const isRectElementWithSharedId =
    element.attributes.type === 'rect' &&
    !!element.animationAttributes.sharedId;

  if (!isRectElementWithSharedId) return;
  assertType(element, 'rect');

  const elementThatWillMorphFromCurrentOne =
    element.animationAttributes.sharedId === undefined
      ? undefined
      : nextSlide.canvasElements.find((elementFromNextSlide) => {
          return (
            elementFromNextSlide.animationAttributes.sharedId ===
            element.animationAttributes.sharedId
          );
        });

  /* The element that will morph from the current one also needs to be a
  rectangle */
  if (elementThatWillMorphFromCurrentOne?.attributes.type !== 'rect') return;

  const areElementsWithSameSharedIdExactlyEqual = compareElements(
    element.attributes,
    elementThatWillMorphFromCurrentOne.attributes
  );

  // Create animation for the current element to disappear
  const animationsOfCurrentElement: AnimationWithoutTimings[] = [
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
    },
  ];

  const elementRect = getCanvasElementRect(element.attributes);

  // Create animation for the other element to morph from the current one
  const animationsOfElementToTransitionTo: AnimationWithoutTimings[] = [
    {
      type: 'morphAppear',
      groupAnimation: { from: { opacity: 0 } },
    },
  ];

  /* Only add morph animation if the elements with same shared ID are not
  exactly equal */
  if (!areElementsWithSameSharedIdExactlyEqual) {
    animationsOfElementToTransitionTo.push({
      type: 'morph',
      groupAnimation: {
        from: {
          x: elementRect.x,
          y: elementRect.y,
          clipWidth: elementRect.width,
          clipHeight: elementRect.height,
        },
      },
      nodeAnimation: {
        from: {
          width: elementRect.width,
          height: elementRect.height,
          fill: element.attributes.fill || defaultElementAttributes.rect.fill,
          // TODO: Include other animatable attributes
        },
      },
    });
  }

  // Set the animations of the current element
  element.animations ??= [];
  element.animations.push(...animationsOfCurrentElement);

  // Set the animations of the element that will morph from the current one
  elementThatWillMorphFromCurrentOne.animations ??= [];
  elementThatWillMorphFromCurrentOne.animations.push(
    ...animationsOfElementToTransitionTo
  );
}
