import { ENTER_EXIT_ELEMENT_TRANSITION_DURATION } from './setAnimationTimings';
import { getCanvasElementRect } from './sizes';
import type { CanvasElementWithAnimationsWithoutTimings } from './sharedTypes';
import { checkProperty } from '@/utils/validation';
import type { Slide } from '@/utils/types';

const BASE_ENTER_DELAY = 0.1;

/**
 * Sets a delay for each element to be used with the enter animation.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function setElementsEnterDelays(
  slides: Slide<CanvasElementWithAnimationsWithoutTimings>[]
) {
  for (const slide of slides) {
    const elementsThatAreNotSharedWithPreviousSlides =
      slide.canvasElements.filter((element) => {
        /* All the elements that are not shared with the previous slide will
        have enter animation (even though some elements that are shared will
        have enter animation, but they should not have an enter delay) */
        return (
          element.animationAttributes.sharedWithPreviousSlide === undefined
        );
      });

    const withoutTextElementsWithDelayRelativeToContainer =
      elementsThatAreNotSharedWithPreviousSlides.filter((element) => {
        /* Always include elements that are not text elements or that are text
        elements but without a container */
        if (
          element.attributes.type !== 'text' ||
          element.animationAttributes.containerId === undefined
        ) {
          return true;
        }

        const textContainer = slide.canvasElements.find((otherElement) => {
          return (
            otherElement.attributes.id ===
            element.animationAttributes.containerId
          );
        });
        const containerHasEnterAnimation = textContainer?.animations?.some(
          (animation) => animation.type === 'enter'
        );

        // Only include text elements whose container has no enter animation
        return !containerHasEnterAnimation;
      });

    // Sort from largest to smallest area
    withoutTextElementsWithDelayRelativeToContainer.sort(
      (elementA, elementB) => {
        const rectOfElementA = getCanvasElementRect(elementA.attributes);
        const rectOfElementB = getCanvasElementRect(elementB.attributes);

        const areaOfElementA = rectOfElementA.width * rectOfElementA.height;
        const areaOfElementB = rectOfElementB.width * rectOfElementB.height;

        return areaOfElementB - areaOfElementA;
      }
    );

    /* Set the enter delay based on the index (the smaller the element, the
    longer the delay, but scaling with the order, not with the area) */
    for (const [
      elementIndex,
      element,
    ] of withoutTextElementsWithDelayRelativeToContainer.entries()) {
      element.animationAttributes.enterDelay = BASE_ENTER_DELAY * elementIndex;
    }
  }

  /* For text elements that are somewhat contained within another element, set a
  delay based on the containing element */
  for (const slide of slides) {
    for (const element of slide.canvasElements) {
      const isTextElementWithContainer =
        checkProperty(element, 'attributes.type', 'text') &&
        !!element.animationAttributes.containerId;
      if (!isTextElementWithContainer) continue;

      const textContainer = slide.canvasElements.find((otherElement) => {
        return (
          otherElement.attributes.id === element.animationAttributes.containerId
        );
      });

      /* Only add a delay based on the container if the container has an enter
      animation */
      const containerHasEnterAnimation = textContainer?.animations?.some(
        (animation) => animation.type === 'enter'
      );
      if (!textContainer || !containerHasEnterAnimation) continue;

      /* Set the text enter delay to be its container enter delay + half the
      enter animation duration */
      element.animationAttributes.enterDelay =
        (textContainer.animationAttributes.enterDelay || 0) +
        ENTER_EXIT_ELEMENT_TRANSITION_DURATION / 2;
    }
  }

  return slides;
}
