import { ENTER_EXIT_ELEMENT_TRANSITION_DURATION } from './setAnimationTimings';
import { getCanvasElementRect } from './sizes';
import { assertType } from './assert';
import type { CanvasElementWithAnimationAttributes } from './sharedTypes';
import type { Slide } from '@/utils/types';

const BASE_ENTER_DELAY = 0.1;

/**
 * Sets a delay for each element to be used with the enter animation.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function setElementsEnterDelays(
  slides: Slide<CanvasElementWithAnimationAttributes>[]
) {
  slides.forEach((slide, slideIndex) => {
    const previousSlide = slides[slideIndex - 1];

    // Set the animation delay for every element possible
    slide.canvasElements
      // Get only the elements that will have an entering animation
      .filter((canvasElement) => {
        /* If an element from the previous slide has the same shared ID, it
        means the current element will not have an enter animation */
        const elementIsSharedWithPreviousSlide =
          canvasElement.animationAttributes.sharedWithPreviousSlide &&
          previousSlide?.canvasElements.some(
            (canvasElementFromPreviousSlide) => {
              return (
                canvasElementFromPreviousSlide.animationAttributes
                  .sharedWithNextSlide?.sharedId ===
                canvasElement.animationAttributes.sharedWithPreviousSlide
                  ?.sharedId
              );
            }
          );

        const elementWillHaveEnteringAnimation =
          !elementIsSharedWithPreviousSlide;

        return elementWillHaveEnteringAnimation;
      })
      // Sort from largest to smallest area
      .sort((elementA, elementB) => {
        const rectOfElementA = getCanvasElementRect(elementA.attributes);
        const rectOfElementB = getCanvasElementRect(elementB.attributes);

        const areaOfElementA = rectOfElementA.width * rectOfElementA.height;
        const areaOfElementB = rectOfElementB.width * rectOfElementB.height;

        return areaOfElementB - areaOfElementA;
      })
      /* Set the enter delay based on the index (the smaller the element, the
      longer the delay, but scaling with the order, not with the area) */
      .forEach((canvasElement, elementIndex) => {
        canvasElement.animationAttributes.enterDelay =
          BASE_ENTER_DELAY * elementIndex;
      });

    /* For text elements that are somewhat contained within another element, set
    a delay based on the containing element */
    slide.canvasElements.forEach((canvasElement) => {
      const isTextElementWithContainer =
        canvasElement.attributes.type === 'text' &&
        !!canvasElement.animationAttributes.containerId;

      if (!isTextElementWithContainer) return;
      assertType(canvasElement, 'text');

      const textContainer = slide.canvasElements.find((otherElement) => {
        return (
          otherElement.attributes.id ===
          canvasElement.animationAttributes.containerId
        );
      });

      if (textContainer?.animationAttributes.enterDelay === undefined) return;

      canvasElement.animationAttributes.enterDelay =
        textContainer.animationAttributes.enterDelay +
        ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
    });
  });

  return slides;
}
