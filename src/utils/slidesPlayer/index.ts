import type Konva from 'konva';
import gsap from 'gsap';

import { setSharedIdsForReusedShapes } from './setReusedShapes';
import { setElementsEnterDelays } from './setAnimationDelays';
import { setTextContainers } from './setTextContainers';
import {
  type Animation,
  type AnimationStates,
  createEnterExitAnimations,
  createRectMorphAnimations,
} from './createAnimations';
import { StageVirtualSize } from '@/utils/konva';
import { findLastIndex } from '@/utils/array';
import { pipe } from '@/utils/pipe';
import type { CanvasElementOfType, Slide } from '@/utils/types';

/** Combines slides by adding animations to transition between them. */
export function combineSlides(slides: Slide[]) {
  /* 3 slides example (considering the complete slide transition as 1s, the
  morph transition as half the complete slide transition (0.5s), and the
  enter/exit transitions as one-fourth the complete slide transition (0.25s)
  each):

  0.25s first transition (enter) -> first slide duration -> 1s transition (0.25s
  exit -> 0.5s morph -> 0.25s enter) -> second slide duration -> 1s transition
  -> third slide duration -> 0.25s last transition (exit) */
  const parsedSlides = pipe(
    slides,
    setSharedIdsForReusedShapes,
    setTextContainers,
    setElementsEnterDelays
  );
  const combinedSlides: {
    canvasElement: (typeof parsedSlides)[number]['canvasElements'][number];
    slideIndex: number;
    animations?: Animation[];
  }[] = [];

  // Setup rect morph animations
  for (const [slideIndex, slide] of parsedSlides.entries()) {
    for (const canvasElement of slide.canvasElements) {
      // Getting the index before adding the current canvas element to the array
      const indexOfElementToTransitionFrom = findLastIndex(
        combinedSlides,
        ({ canvasElement: elementFromCombinedSlides }) => {
          return elementFromCombinedSlides.sharedId === canvasElement.sharedId;
        }
      );

      combinedSlides.push({ canvasElement, slideIndex });

      const hasElementToTransitionFrom =
        canvasElement.sharedId && indexOfElementToTransitionFrom !== -1;
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

      const {
        animationsOfElementToTransitionFrom,
        animationsOfCurrentElement,
      } = createRectMorphAnimations({
        slides,
        slideIndex,
        elementToTransitionFrom: elementToTransitionFrom.canvasElement,
      });

      // Set the animations of the element to transition from
      elementToTransitionFrom.animations ??= [];
      elementToTransitionFrom.animations.push(
        ...animationsOfElementToTransitionFrom
      );

      // Set the animations of the current element
      currentElement.animations = animationsOfCurrentElement;
    }
  }

  // Setup enter/exit animations
  combinedSlides.forEach((item) => {
    const { enterAnimations, exitAnimations } = createEnterExitAnimations({
      canvasElement: item.canvasElement,
      slides,
      slideIndex: item.slideIndex,
      enterDelay: item.canvasElement.enterDelay,
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
