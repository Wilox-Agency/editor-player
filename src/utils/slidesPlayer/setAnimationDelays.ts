import { ENTER_EXIT_ELEMENT_TRANSITION_DURATION } from './createAnimations';
import { getCanvasElementRect } from './sizes';
import type {
  AddEnterDelay,
  AddTextContainerId,
  CanvasElementWithSharedId,
} from './sharedTypes';
import type { Slide } from '@/utils/types';

const BASE_ENTER_DELAY = 0.1;

export function setElementsEnterDelays<
  TElement extends CanvasElementWithSharedId
>(slides: Slide<TElement>[]) {
  type CanvasElementWithTextContainerIdAndEnterDelay = AddEnterDelay<
    AddTextContainerId<TElement>
  >;

  const slidesCopy = slides.map((slide) => {
    return {
      ...slide,
      canvasElements: slide.canvasElements.map((canvasElement) => ({
        ...canvasElement,
      })),
    };
  }) as Slide<CanvasElementWithTextContainerIdAndEnterDelay>[];

  slidesCopy.forEach((slide, slideIndex) => {
    const previousSlide = slidesCopy[slideIndex - 1];

    // Set the animation delay for every element possible
    slide.canvasElements
      // Get only the elements that will have an entering animation
      .filter((canvasElement) => {
        /* If an element from the previous slide has the same shared ID, it
        means the current element will morph from it */
        const elementWillMorphFromOtherElement =
          canvasElement.sharedId &&
          previousSlide?.canvasElements.some(
            (canvasElementFromPreviousSlide) => {
              return (
                canvasElementFromPreviousSlide.sharedId ===
                canvasElement.sharedId
              );
            }
          );

        const elementWillHaveEnteringAnimation =
          !elementWillMorphFromOtherElement;

        return elementWillHaveEnteringAnimation;
      })
      // Sort from largest to smallest area
      .sort((elementA, elementB) => {
        const rectOfElementA = getCanvasElementRect(elementA);
        const rectOfElementB = getCanvasElementRect(elementB);

        const areaOfElementA = rectOfElementA.width * rectOfElementA.height;
        const areaOfElementB = rectOfElementB.width * rectOfElementB.height;

        return areaOfElementB - areaOfElementA;
      })
      /* Set the enter delay based on the index (the smaller the element, the
      longer the delay, but scaling with the order, not with the area) */
      .forEach((canvasElement, elementIndex) => {
        canvasElement.enterDelay = BASE_ENTER_DELAY * elementIndex;
      });

    /* For text elements that are somewhat contained within another element, set
    a delay based on the containing element */
    slide.canvasElements.forEach((canvasElement) => {
      if (canvasElement.type !== 'text' || !canvasElement.containerId) return;

      const textContainer = slide.canvasElements.find(
        (otherElement) => otherElement.id === canvasElement.containerId
      );

      if (textContainer?.enterDelay === undefined) return;

      canvasElement.enterDelay =
        textContainer.enterDelay + ENTER_EXIT_ELEMENT_TRANSITION_DURATION;
    });
  });

  return slidesCopy;
}
