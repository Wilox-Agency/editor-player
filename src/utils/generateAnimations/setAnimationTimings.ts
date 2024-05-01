import type { CanvasElementWithAnimations } from './sharedTypes';

const COMPLETE_SLIDE_TRANSITION_DURATION = 3;
export const MORPH_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 3;
export const ENTER_EXIT_ELEMENT_TRANSITION_DURATION =
  COMPLETE_SLIDE_TRANSITION_DURATION / 3;

/**
 * Some animations don't work properly if their duration is exactly 0,
 * therefore a decimal close to 0 is used instead.
 */
const ALMOST_ZERO_DURATION = 0.001;

export function setEnterAnimationTimings({
  element,
  slideHasMorphAnimation,
  currentTime,
}: {
  element: CanvasElementWithAnimations;
  slideHasMorphAnimation: boolean;
  currentTime: number;
}) {
  for (const animation of element.animations || []) {
    if (animation.type === 'appear') {
      const isElementSharedWithPreviousSlide =
        element.animationAttributes.sharedWithPreviousSlide !== undefined;

      let startTime = currentTime;
      /* TODO: Only set the `enterDelay` animation attribute if the element is
      not exactly equal to an element in the previous slide, maybe using a
      shared ID for that. Or simply add the delay after the animations without
      timings have been set (but, obviously, before setting the animation
      timings) */
      /* Only add enter delay when the element will have enter animation (i.e.
      is not equal to some element in the previous slide) */
      if (!isElementSharedWithPreviousSlide) {
        startTime += element.animationAttributes.enterDelay || 0;
      }

      /* Make the element appear when the morph transition starts if it will not
      have an enter animation and the slide has a morph animation */
      if (isElementSharedWithPreviousSlide && slideHasMorphAnimation) {
        startTime -= MORPH_ELEMENT_TRANSITION_DURATION;
      }

      animation.duration = ALMOST_ZERO_DURATION;

      animation.startTime = startTime;
      continue;
    }

    if (animation.type === 'enter') {
      animation.duration = ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
      animation.startTime =
        currentTime + (element.animationAttributes.enterDelay || 0);
    }
  }
}

export function setExitAnimationTimings({
  element,
  slideHasExitAnimation,
  currentTime,
}: {
  element: CanvasElementWithAnimations;
  slideHasExitAnimation: boolean;
  currentTime: number;
}) {
  const isElementSharedWithNextSlideWithSlideInAnimation =
    element.animationAttributes.sharedWithNextSlide?.animationType ===
    'slideIn';

  for (const animation of element.animations || []) {
    if (animation.type === 'disappear') {
      animation.duration = ALMOST_ZERO_DURATION;

      animation.startTime = currentTime;

      if (slideHasExitAnimation) {
        animation.startTime += ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
      }
      /* If the element is shared with the next slide and it has a slide-in
      animation, then it should disappear after the slide-in animation */
      if (isElementSharedWithNextSlideWithSlideInAnimation) {
        animation.startTime += ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
      }
      continue;
    }

    if (animation.type === 'exit') {
      animation.duration = ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
      animation.startTime = currentTime;
    }
  }
}

export function setRectMorphAnimationTimings({
  element,
  currentTime,
}: {
  element: CanvasElementWithAnimations;
  currentTime: number;
}) {
  for (const animation of element.animations || []) {
    if (animation.type === 'morphAppear') {
      animation.duration = ALMOST_ZERO_DURATION;
      animation.startTime = currentTime;
      continue;
    }

    if (animation.type === 'morph') {
      animation.duration = MORPH_ELEMENT_TRANSITION_DURATION;
      animation.startTime = currentTime;
    }
  }
}
