import type { IRect } from 'konva/lib/types';

import { getCanvasElementRect } from './sizes';
import type { AddTextContainerId } from './sharedTypes';
import { StageVirtualSize, defaultElementAttributes } from '@/utils/konva';
import { pipe } from '@/utils/pipe';
import type { CanvasElement, CanvasElementOfType, Slide } from '@/utils/types';

export type AnimationStates = Partial<{
  from: Record<string, string | number>;
  to: Record<string, string | number>;
}>;

export type Animation = {
  type: 'morph' | 'enter' | 'exit' | 'appear' | 'disappear';
  duration: number;
  startTime: number;
  groupAnimation?: AnimationStates;
  nodeAnimation?: AnimationStates;
};

const COMPLETE_SLIDE_TRANSITION_DURATION = 2;
const MORPH_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 2;
const FADE_ELEMENT_TRANSITION_DURATION = COMPLETE_SLIDE_TRANSITION_DURATION / 4;
const PRESENTATION_START_END_TRANSITION_DURATION =
  FADE_ELEMENT_TRANSITION_DURATION;

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

/**
 * Some animations don't work properly if their duration is exactly 0,
 * therefore a decimal close to 0 is used instead.
 */
const ALMOST_ZERO_DURATION = 0.001;

export function createEnterExitAnimations({
  canvasElement,
  slides,
  slideIndex,
  enterDelay,
}: {
  canvasElement: AddTextContainerId<CanvasElement>;
  slides: Slide[];
  slideIndex: number;
  /** The enter delay is required, but it may be undefined. */
  enterDelay: number | undefined;
}) {
  const elementRect = getCanvasElementRect(canvasElement);
  let sideToAnimateFrom;
  if (
    canvasElement.type === 'text' &&
    canvasElement.containerId !== undefined
  ) {
    const textContainer = slides[slideIndex]?.canvasElements.find(
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
    {
      invisible: Record<string, number>;
      visible: Record<string, number>;
    }
  >;

  const animationVars = animationsVarsByDirection[sideToAnimateFrom];

  const sumOfDurationOfSlidesUntilNow = getSumOfDurationOfSlidesUntilNow(
    slides,
    slideIndex
  );
  const currentSlideDuration = slides[slideIndex]!.duration;
  const enterStartTime =
    /* When it's from the first slide, the start time should be only the
    element's enter delay. When it's from any other slide, the start time should
    be right after the morph element transition of the reused elements plus the
    element's enter delay */
    slideIndex === 0
      ? enterDelay || 0
      : PRESENTATION_START_END_TRANSITION_DURATION +
        sumOfDurationOfSlidesUntilNow +
        COMPLETE_SLIDE_TRANSITION_DURATION * (slideIndex - 1) +
        (FADE_ELEMENT_TRANSITION_DURATION + MORPH_ELEMENT_TRANSITION_DURATION) +
        (enterDelay || 0);
  const exitStartTime =
    PRESENTATION_START_END_TRANSITION_DURATION +
    (sumOfDurationOfSlidesUntilNow + currentSlideDuration) +
    COMPLETE_SLIDE_TRANSITION_DURATION * slideIndex;

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
      duration: FADE_ELEMENT_TRANSITION_DURATION,
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
      duration: FADE_ELEMENT_TRANSITION_DURATION,
      startTime: exitStartTime,
    },
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime:
        exitStartTime + FADE_ELEMENT_TRANSITION_DURATION - ALMOST_ZERO_DURATION,
    },
  ];

  return { enterAnimations, exitAnimations };
}

export function createRectMorphAnimations({
  slides,
  slideIndex,
  elementToTransitionFrom,
}: {
  slides: Slide[];
  slideIndex: number;
  elementToTransitionFrom: CanvasElementOfType<'rect'>;
}) {
  const sumOfDurationOfSlidesUntilNow = getSumOfDurationOfSlidesUntilNow(
    slides,
    slideIndex
  );
  const animationStartTime =
    PRESENTATION_START_END_TRANSITION_DURATION +
    sumOfDurationOfSlidesUntilNow +
    FADE_ELEMENT_TRANSITION_DURATION +
    /* `slideIndex - 1` can never be negative because there will be no morph
    transition to the first slide (index 0), only to the second slide (index 1)
    and beyond */
    COMPLETE_SLIDE_TRANSITION_DURATION * (slideIndex - 1);

  // Make the previous element with same shared ID disappear
  const animationsOfElementToTransitionFrom = [
    {
      type: 'disappear',
      groupAnimation: { to: { opacity: 0 } },
      duration: ALMOST_ZERO_DURATION,
      startTime: animationStartTime,
    },
  ] as const satisfies Animation[];

  const widthFrom =
    elementToTransitionFrom.width || defaultElementAttributes.rect.width;
  const heightFrom =
    elementToTransitionFrom.height || defaultElementAttributes.rect.height;
  // Make the current element morph from the previous one with same shared ID
  const animationsOfCurrentElement = [
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
          x: elementToTransitionFrom.x || 0,
          y: elementToTransitionFrom.y || 0,
          clipWidth: widthFrom,
          clipHeight: heightFrom,
        },
      },
      nodeAnimation: {
        from: {
          width: widthFrom,
          height: heightFrom,
          fill:
            elementToTransitionFrom.fill || defaultElementAttributes.rect.fill,
          // TODO: Include other animatable attributes
        },
      },
      duration: MORPH_ELEMENT_TRANSITION_DURATION,
      startTime: animationStartTime,
    },
  ] as const satisfies Animation[];

  return { animationsOfElementToTransitionFrom, animationsOfCurrentElement };
}
