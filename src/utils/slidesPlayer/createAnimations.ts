import type { IRect } from 'konva/lib/types';

import { getCanvasElementRect } from './sizes';
import type {
  AddEnterDelay,
  AddTextContainerId,
  Animation,
  CanvasElementWithAnimations,
  CanvasElementWithSharedId,
} from './sharedTypes';
import { StageVirtualSize, defaultElementAttributes } from '@/utils/konva';
import { pipe } from '@/utils/pipe';
import type { CanvasElement } from '@/utils/types';

const COMPLETE_SLIDE_TRANSITION_DURATION = 3;
const MORPH_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 3;
export const ENTER_EXIT_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 3;

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

/**
 * Some animations don't work properly if their duration is exactly 0,
 * therefore a decimal close to 0 is used instead.
 */
const ALMOST_ZERO_DURATION = 0.001;

function getSideToAnimateEnterExitAnimationsFrom<
  TElement extends AddTextContainerId<CanvasElement>
>({
  canvasElement,
  slideElements,
}: {
  canvasElement: TElement;
  slideElements: TElement[];
}) {
  const elementRect = getCanvasElementRect(canvasElement);

  let sideToAnimateFrom;
  if (
    canvasElement.type === 'text' &&
    canvasElement.containerId !== undefined
  ) {
    const textContainer = slideElements.find(
      (otherElement) => otherElement.id === canvasElement.containerId
    );
    if (textContainer) {
      /* TODO: If a new method of deciding the side an element animates from when
      entering/exiting is added, instead of using
      `getElementSideClosestToStageEdge` to get the side the text container is
      animating from, get directly by the side that was decided previously */
      sideToAnimateFrom = pipe(
        textContainer,
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

function getEnterExitAnimationVars<
  TElement extends CanvasElementWithAnimations<
    AddTextContainerId<CanvasElement>
  >
>({
  element,
  slide,
}: {
  element: TElement;
  slide: {
    canvasElements: TElement[];
    duration: number;
  };
}) {
  const sideToAnimateFrom = getSideToAnimateEnterExitAnimationsFrom({
    canvasElement: element.attributes,
    slideElements: slide.canvasElements.map(
      ({ attributes: canvasElement }) => canvasElement
    ),
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

/**
 * @returns The duration of the animation.
 */
export function setEnterAnimation<
  TElement extends CanvasElementWithAnimations<
    AddEnterDelay<AddTextContainerId<CanvasElement>>
  >
>({
  element,
  slide,
  currentTime,
}: {
  element: TElement;
  slide: {
    canvasElements: TElement[];
    duration: number;
  };
  currentTime: number;
}) {
  element.animations ??= [];
  const alreadyHasAppearAnimation = element.animations.some(
    (animation) => animation.type === 'appear'
  );
  // const firstAnimation = element.animations[0];
  // const firstAnimationIsAppearAnimation = firstAnimation?.type === 'appear';

  /* If the element already has an appear animation, do not add an enter
  animation and return a duration of 0 */
  if (alreadyHasAppearAnimation) return 0;

  const animationVars = getEnterExitAnimationVars({ element, slide });

  const duration = ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
  const enterAnimations: Animation[] = [
    {
      type: 'appear',
      groupAnimation: { from: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: currentTime + (element.attributes.enterDelay || 0),
    },
    {
      type: 'enter',
      groupAnimation: {
        from: animationVars.invisible,
        to: animationVars.visible,
      },
      duration,
      startTime: currentTime + (element.attributes.enterDelay || 0),
    },
  ];

  element.animations.push(...enterAnimations);

  return duration;
}

/**
 * @returns The duration of the animation.
 */
export function setExitAnimation<
  TElement extends CanvasElementWithAnimations<
    AddEnterDelay<AddTextContainerId<CanvasElement>>
  >
>({
  element,
  slide,
  currentTime,
}: {
  element: TElement;
  slide: {
    canvasElements: TElement[];
    duration: number;
  };
  currentTime: number;
}) {
  element.animations ??= [];
  const alreadyHasDisappearAnimation = element.animations.some(
    (animation) => animation.type === 'disappear'
  );
  // const lastAnimation = element.animations[element.animations.length - 1];
  // const lastAnimationIsDisappearAnimation = lastAnimation?.type === 'disappear';

  /* If the element already has an disappear animation, do not add an enter
  animation and return a duration of 0 */
  if (alreadyHasDisappearAnimation) return 0;

  const animationVars = getEnterExitAnimationVars({ element, slide });

  const duration = ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
  const exitAnimations: Animation[] = [
    {
      type: 'exit',
      groupAnimation: {
        from: animationVars.visible,
        to: animationVars.invisible,
      },
      duration,
      startTime: currentTime,
    },
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: currentTime + (duration - ALMOST_ZERO_DURATION),
    },
  ];

  element.animations.push(...exitAnimations);

  return duration;
}

/**
 * @returns The duration of the animation.
 */
export function setRectMorphAnimations<
  TElement extends CanvasElementWithAnimations<
    AddEnterDelay<AddTextContainerId<CanvasElementWithSharedId>>
  >
>({
  element,
  nextSlide,
  currentTime,
}: {
  element: TElement;
  nextSlide: {
    canvasElements: TElement[];
    duration: number;
  };
  currentTime: number;
}) {
  // The current element needs to be a rectangle
  if (element.attributes.type !== 'rect') return 0;

  const elementThatWillMorphFromCurrentOne = nextSlide.canvasElements.find(
    (elementFromNextSlide) => {
      return (
        elementFromNextSlide.attributes.sharedId === element.attributes.sharedId
      );
    }
  );

  /* The element that will morph from the current one also needs to be a
  rectangle */
  if (elementThatWillMorphFromCurrentOne?.attributes.type !== 'rect') return 0;

  // Create animation for the current element to disappear
  const animationsOfCurrentElement = [
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: currentTime,
    },
  ] as const satisfies Animation[];

  const elementRect = getCanvasElementRect(element.attributes);
  const duration = MORPH_ELEMENT_TRANSITION_DURATION;

  // Create animation for the other element to morph from the current one
  const animationsOfElementToTransitionTo = [
    {
      type: 'appear',
      groupAnimation: { from: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: currentTime,
    },
    {
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
      duration,
      startTime: currentTime,
    },
  ] as const satisfies Animation[];

  // Set the animations of the current element
  element.animations ??= [];
  element.animations.push(...animationsOfCurrentElement);

  // Set the animations of the element that will morph from the current one
  elementThatWillMorphFromCurrentOne.animations ??= [];
  elementThatWillMorphFromCurrentOne.animations.push(
    ...animationsOfElementToTransitionTo
  );

  return duration;
}
