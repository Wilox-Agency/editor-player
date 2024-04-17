import type Konva from 'konva';
import gsap from 'gsap';

import {
  setSharedIdsForReusedElements,
  setSharedIdsForReusedRectsThatShouldMorph,
} from './setReusedShapes';
import { setElementsEnterDelays } from './setAnimationDelays';
import { setTextContainers } from './setTextContainers';
import { createDummyElementsForSharedElementSlideInAnimation } from './createDummyElementsForSharedElementSlideInAnimation';
import {
  setEnterAnimationWithoutTimings,
  setExitAnimationWithoutTimings,
  setRectMorphAnimationsWithoutTimings,
} from './setAnimationsWithoutTimings';
import {
  ENTER_EXIT_ELEMENT_TRANSITION_DURATION,
  MORPH_ELEMENT_TRANSITION_DURATION,
  setEnterAnimationTimings,
  setExitAnimationTimings,
  setRectMorphAnimationTimings,
} from './setAnimationTimings';
import type {
  Animation,
  AnimationStates,
  CanvasElementWithAnimationAttributes,
  CanvasElementWithAnimations,
  CanvasElementWithAnimationsWithoutTimings,
} from './sharedTypes';
import { StageVirtualSize } from '@/utils/konva';
import { pipe } from '@/utils/pipe';
import type {
  CanvasElementOfType,
  SlideWithAudioAndStartTime,
  SlideWithAudio,
} from '@/utils/types';

function setEmptyAnimationAttributes(
  slides: SlideWithAudio[]
): SlideWithAudio<CanvasElementWithAnimationAttributes>[] {
  return slides.map((slide) => {
    return {
      ...slide,
      canvasElements: slide.canvasElements.map((canvasElement) => {
        return {
          attributes: { ...canvasElement },
          animationAttributes: {},
        } as CanvasElementWithAnimationAttributes;
      }),
    };
  });
}

/**
 * Set slide transition animations for all elements in the provided slides.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array (but with a different type which includes the animations).
 */
function setAnimationsWithoutTimings(
  slides: SlideWithAudio<CanvasElementWithAnimationsWithoutTimings>[]
) {
  for (const [slideIndex, slide] of slides.entries()) {
    const nextSlide = slides[slideIndex + 1];

    for (const element of slide.canvasElements) {
      if (nextSlide) {
        setRectMorphAnimationsWithoutTimings({ element, nextSlide });
      }
      /* First slide should not have enter animation (i.e. should be visible
      from the start) */
      if (slideIndex !== 0) {
        setEnterAnimationWithoutTimings({ element, slide });
      }
      setExitAnimationWithoutTimings({ element, slide });
    }
  }

  return slides;
}

function getWhichTransitionsSlideHas(
  slide: SlideWithAudio<CanvasElementWithAnimationsWithoutTimings>
) {
  let slideHasEnterAnimation = false;
  let slideHasExitAnimation = false;
  let slideHasMorphAnimation = false;

  for (const element of slide.canvasElements) {
    const allAnimationTypesArePresent =
      slideHasEnterAnimation && slideHasExitAnimation && slideHasMorphAnimation;
    /* It's not necessary to keep checking the remaining elements if it's
    already known that all animation types are present */
    if (allAnimationTypesArePresent) break;

    for (const animation of element.animations || []) {
      if (animation.type === 'enter') {
        slideHasEnterAnimation = true;
        continue;
      }
      if (animation.type === 'exit') {
        slideHasExitAnimation = true;
        continue;
      }
      if (animation.type === 'morph') {
        slideHasMorphAnimation = true;
      }
    }
  }

  return {
    slideHasEnterAnimation,
    slideHasExitAnimation,
    slideHasMorphAnimation,
  };
}

/**
 * Set the animation timings (duration and start time) for all elements in the
 * provided slides.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array (but with a different type which includes the animation
 * timings).
 */
function setAnimationTimings(
  slides: SlideWithAudio<CanvasElementWithAnimationsWithoutTimings>[]
) {
  let currentTime = 0;
  currentTime = 0;

  for (const slide of slides) {
    const {
      slideHasEnterAnimation,
      slideHasExitAnimation,
      slideHasMorphAnimation,
    } = getWhichTransitionsSlideHas(slide);

    // Set rect morph animations
    for (const element of slide.canvasElements) {
      setRectMorphAnimationTimings({
        element: element as CanvasElementWithAnimations,
        currentTime,
      });
    }
    /* FIXME: This duration should only be added if there's an enter animation
    with delay that's not relative to another element (which happens when a text
    has a delay to only enter after its container has entered) */
    if (slideHasMorphAnimation) {
      // Add the duration of the rect morph animations
      currentTime += MORPH_ELEMENT_TRANSITION_DURATION;
    }

    // Set enter animations
    for (const element of slide.canvasElements) {
      setEnterAnimationTimings({
        element: element as CanvasElementWithAnimations,
        slideHasMorphAnimation,
        currentTime,
      });
    }
    if (slideHasEnterAnimation) {
      // Add the duration of the enter animations
      currentTime += ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
    }

    /* Save the start time of the slide (used to know when audio should be
    played) */
    (
      slide as SlideWithAudioAndStartTime<CanvasElementWithAnimations>
    ).startTime = currentTime;
    // Add the duration of the slide
    currentTime += slide.duration;

    // Set exit animations
    for (const element of slide.canvasElements) {
      setExitAnimationTimings({
        element: element as CanvasElementWithAnimations,
        slideHasExitAnimation,
        currentTime,
        slideDuration: slide.duration,
      });
    }
    if (slideHasExitAnimation) {
      // Add the duration of the exit animations
      currentTime += ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
    }
  }

  return slides as SlideWithAudioAndStartTime<CanvasElementWithAnimations>[];
}

/** Adds animations to transition between slides. */
export function addAnimationsToSlides(slides: SlideWithAudio[]) {
  /* 3 slides example (considering the complete slide transition as 3s, and each
  part of the transition as one-third of the complete slide transition):

  1s first transition (enter) -> first slide duration -> 3s transition (1s exit
  -> 1 morph -> 1s enter) -> second slide duration -> 3s transition -> third
  slide duration -> 1s last transition (exit) */

  const animatedSlides = pipe(
    slides,
    setEmptyAnimationAttributes,
    setSharedIdsForReusedRectsThatShouldMorph,
    setSharedIdsForReusedElements,
    setTextContainers,
    createDummyElementsForSharedElementSlideInAnimation,
    setAnimationsWithoutTimings,
    setElementsEnterDelays,
    setAnimationTimings
  );

  return animatedSlides;
}

/** Combines animated slides to be used in the animation player. */
export function combineSlides(
  animatedSlides: SlideWithAudioAndStartTime<CanvasElementWithAnimations>[]
) {
  const combinedSlides: {
    canvasElements: CanvasElementWithAnimations[];
    audios: {
      url: string;
      shouldBePlayedAt: number;
      start?: number;
      duration: number;
    }[];
  } = { canvasElements: [], audios: [] };

  for (const slide of animatedSlides) {
    combinedSlides.canvasElements.push(...slide.canvasElements);
    if (slide.audio) {
      combinedSlides.audios.push({
        url: slide.audio.url,
        shouldBePlayedAt: slide.startTime,
        start: slide.audio.start,
        duration: slide.duration,
      });
    }
  }
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
    // On 'appear', 'morphAppear' and 'disappear' animations...
    animationType === 'appear' ||
    animationType === 'morphAppear' ||
    animationType === 'disappear'
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
