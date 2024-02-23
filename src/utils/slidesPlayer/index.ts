import type Konva from 'konva';
import gsap from 'gsap';

import { setSharedIdsForReusedShapes } from './setReusedShapes';
import { setElementsEnterDelays } from './setAnimationDelays';
import { setTextContainers } from './setTextContainers';
import {
  setEnterAnimation,
  setExitAnimation,
  setRectMorphAnimations,
} from './createAnimations';
import type {
  Animation,
  AnimationStates,
  CanvasElementWithAnimations,
  CanvasElementWithSharedId,
} from './sharedTypes';
import { StageVirtualSize } from '@/utils/konva';
import { pipe } from '@/utils/pipe';
import type { CanvasElementOfType, Slide } from '@/utils/types';

/**
 * @returns A boolean representing if an element from the next slide will morph
 * from the provided element (i.e. will be "reused" in the next slide).
 */
function getElementWillBeReusedInNextSlide<
  TElement extends CanvasElementWithAnimations<CanvasElementWithSharedId>
>(element: TElement, nextSlide: { canvasElements: TElement[] } | undefined) {
  if (element.attributes.sharedId === undefined || !nextSlide) return false;

  return nextSlide.canvasElements.some((elementFromNextSlide) => {
    return (
      elementFromNextSlide.attributes.sharedId === element.attributes.sharedId
    );
  });
}

/** Combines slides by adding animations to transition between them. */
export function combineSlides(slides: Slide[]) {
  /* 3 slides example (considering the complete slide transition as 3s, and each
  part of the transition as one-third of the complete slide transition):

  1s first transition (enter) -> first slide duration -> 3s transition (1s exit
  -> 1 morph -> 1s enter) -> second slide duration -> 3s transition -> third
  slide duration -> 1s last transition (exit) */
  const parsedSlides = pipe(
    slides,
    setSharedIdsForReusedShapes,
    setTextContainers,
    setElementsEnterDelays
  );

  type ArrayOfCanvasElementsWithAnimations = CanvasElementWithAnimations<
    (typeof parsedSlides)[number]['canvasElements'][number]
  >[];

  const slidesWithElementAnimations: {
    canvasElements: ArrayOfCanvasElementsWithAnimations;
    duration: number;
  }[] = parsedSlides.map((slide) => {
    return {
      canvasElements: slide.canvasElements.map((canvasElement) => {
        return { attributes: canvasElement };
      }),
      duration: slide.duration,
    };
  });

  let currentTime = 0;
  for (const [slideIndex, slide] of slidesWithElementAnimations.entries()) {
    const nextSlide = slidesWithElementAnimations[slideIndex + 1];

    // Set enter animations
    let enterDuration = 0;
    for (const element of slide.canvasElements) {
      const animationDuration = setEnterAnimation({
        element,
        slide,
        currentTime,
      });
      enterDuration = Math.max(animationDuration, enterDuration);
    }
    // Add the duration of the enter animations
    currentTime += enterDuration;
    // Add the duration of the slide
    currentTime += slide.duration;

    // Set exit animations
    let exitDuration = 0;
    for (const element of slide.canvasElements) {
      const elementWillBeReusedInNextSlide = getElementWillBeReusedInNextSlide(
        element,
        nextSlide
      );
      if (elementWillBeReusedInNextSlide) continue;

      const animationDuration = setExitAnimation({
        element,
        slide,
        currentTime,
      });
      exitDuration = Math.max(animationDuration, exitDuration);
    }
    // Add the duration of the exit animations
    currentTime += exitDuration;

    if (!nextSlide) continue;

    // Set rect morph animations
    let rectMorphDuration = 0;
    for (const element of slide.canvasElements) {
      const animationDuration = setRectMorphAnimations({
        element,
        nextSlide,
        currentTime,
      });
      rectMorphDuration = Math.max(animationDuration, rectMorphDuration);
    }
    // Add the duration of the rect morph animations
    currentTime += rectMorphDuration;
  }

  return slidesWithElementAnimations.reduce<ArrayOfCanvasElementsWithAnimations>(
    (accumulator, slide) => accumulator.concat(slide.canvasElements),
    []
  );
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
  animationType,
  animationStates,
  duration,
}: {
  target: Konva.Node;
  animationType: Animation['type'];
  animationStates: AnimationStates;
  duration: number;
}) {
  const listeners =
    // On 'appear' and 'disappear' animations...
    animationType === 'appear' || animationType === 'disappear'
      ? {
          /* ...show or hide the element depending on the opacity, so the
          element doesn't have to be rendered, improving performance */
          onUpdate: () => {
            target.visible(target.opacity() > 0);
          },
        }
      : {};

  if (animationStates.from && animationStates.to) {
    return gsap.fromTo(
      target,
      { ...animationStates.from, duration, ease: 'power2.out', ...listeners },
      { ...animationStates.to, duration, ease: 'power2.out', ...listeners }
    );
  }

  if (animationStates.from) {
    return gsap.from(target, {
      ...animationStates.from,
      duration,
      ease: 'power2.out',
      ...listeners,
    });
  }

  if (animationStates.to) {
    return gsap.to(target, {
      ...animationStates.to,
      duration,
      ease: 'power2.out',
      ...listeners,
    });
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
      animationType: animation.type,
      animationStates: animation.groupAnimation,
      duration: animation.duration,
    });
  }

  if (animation.nodeAnimation) {
    nodeTween = createTween({
      target: node,
      animationType: animation.type,
      animationStates: animation.nodeAnimation,
      duration: animation.duration,
    });
  }

  return { groupTween, nodeTween };
}
