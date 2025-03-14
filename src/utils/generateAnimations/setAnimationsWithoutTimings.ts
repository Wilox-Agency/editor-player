import type { IRect } from 'konva/lib/types';

import type {
  AnimationWithoutTimings,
  CanvasElementWithAnimationAttributes,
  CanvasElementWithAnimationsWithoutTimings,
} from './sharedTypes';
import { StageVirtualSize, defaultElementAttributes } from '@/utils/konva';
import { getCanvasElementRect } from '@/utils/konva/rect';
import { pipe } from '@/utils/pipe';
import { checkProperty } from '@/utils/validation';

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
    typeof sideToAnimateFrom,
    { invisible: Record<string, number>; visible: Record<string, number> }
  >;
  const animationVars = animationsVarsByDirection[sideToAnimateFrom];

  return animationVars;
}

export function setEnterAnimationWithoutTimings({
  element,
  slide,
}: {
  element: CanvasElementWithAnimationsWithoutTimings;
  slide: { canvasElements: CanvasElementWithAnimationsWithoutTimings[] };
}) {
  element.animations ??= [];

  /* If the element already has an appear animation, do not add an enter
  animation */
  const alreadyHasAppearAnimation = element.animations.some((animation) => {
    return animation.type === 'appear' || animation.type === 'morphAppear';
  });
  if (alreadyHasAppearAnimation) return;

  const animationVars = getEnterExitAnimationVars({ element, slide });

  const animations: AnimationWithoutTimings[] = [
    {
      type: 'appear',
      groupAnimation: { from: { opacity: 0 } },
    },
  ];

  /* Only add enter animation if the element is not shared with the previous
  slide or it is shared but should have the slide-in animation */
  const shouldHaveEnterAnimation =
    element.animationAttributes.sharedWithPreviousSlide === undefined ||
    element.animationAttributes.sharedWithPreviousSlide.animationType ===
      'slideIn';
  if (shouldHaveEnterAnimation) {
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
}: {
  element: CanvasElementWithAnimationsWithoutTimings;
  slide: { canvasElements: CanvasElementWithAnimationsWithoutTimings[] };
}) {
  element.animations ??= [];

  /* If the element already has an disappear animation, do not add an enter
  animation */
  const alreadyHasDisappearAnimation = element.animations.some(
    (animation) => animation.type === 'disappear'
  );
  if (alreadyHasDisappearAnimation) return;

  const animationVars = getEnterExitAnimationVars({ element, slide });

  const animations: AnimationWithoutTimings[] = [
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
    },
  ];

  // Only add exit animation if the element is not shared with the next slide
  const shouldHaveExitAnimation =
    element.animationAttributes.sharedWithNextSlide === undefined;
  if (shouldHaveExitAnimation) {
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
  const isSharedRectElementWithMorphAnimation =
    checkProperty(element, 'attributes.type', 'rect') &&
    checkProperty(
      element,
      'animationAttributes.sharedWithNextSlide.animationType',
      'morph'
    );
  if (!isSharedRectElementWithMorphAnimation) return;

  const elementThatWillMorphFromCurrentOne = nextSlide.canvasElements.find(
    (elementFromNextSlide) => {
      return (
        elementFromNextSlide.animationAttributes.sharedWithPreviousSlide
          ?.sharedId ===
        element.animationAttributes.sharedWithNextSlide.sharedId
      );
    }
  );

  /* The element that will morph from the current one also needs to be a
  rectangle */
  if (elementThatWillMorphFromCurrentOne?.attributes.type !== 'rect') return;

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

  // Set the animations of the current element
  element.animations ??= [];
  element.animations.push(...animationsOfCurrentElement);

  // Set the animations of the element that will morph from the current one
  elementThatWillMorphFromCurrentOne.animations ??= [];
  elementThatWillMorphFromCurrentOne.animations.push(
    ...animationsOfElementToTransitionTo
  );
}
