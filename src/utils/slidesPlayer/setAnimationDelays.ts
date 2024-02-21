import type { CanvasElementWithSharedId } from './setReusedShapes';
import type { CanvasElement, Slide } from '@/utils/types';

export type CanvasElementWithSharedIdAndEnterDelay =
  CanvasElementWithSharedId & {
    enterDelay?: number;
  };

const BASE_ENTER_DELAY = 0.1;

export function setElementsEnterDelays(
  slides: Slide<CanvasElementWithSharedId>[]
) {
  type NonTextElement = Extract<
    CanvasElementWithSharedIdAndEnterDelay,
    { type: Exclude<CanvasElement['type'], 'text'> }
  >;

  const slidesCopy: Slide<CanvasElementWithSharedIdAndEnterDelay>[] =
    slides.map((slide) => {
      return {
        ...slide,
        canvasElements: slide.canvasElements.map((canvasElement) => ({
          ...canvasElement,
        })),
      };
    });

  slidesCopy.forEach((slide, slideIndex) => {
    const previousSlide = slidesCopy[slideIndex - 1];

    slide.canvasElements
      /* Get only the elements that will have an entering animation whose type
      is not 'text' */
      .filter((canvasElement): canvasElement is NonTextElement => {
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
        const isText = canvasElement.type === 'text';

        return elementWillHaveEnteringAnimation && !isText;
      })
      // Sort from largest to smallest area
      .sort((elementA, elementB) => {
        const areaOfElementA = (elementA.width || 0) * (elementA.height || 0);
        const areaOfElementB = (elementB.width || 0) * (elementB.height || 0);
        return areaOfElementB - areaOfElementA;
      })
      /* Set the enter delay based on the index (the smaller the element, the
      longer the delay, but scaling with the order, not with the area) */
      .forEach((canvasElement, elementIndex) => {
        canvasElement.enterDelay = BASE_ENTER_DELAY * elementIndex;
      });
  });

  return slidesCopy;
}
