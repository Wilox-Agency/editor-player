import type { CanvasElementWithAnimationAttributes } from './sharedTypes';
import { getElementThatContainsText } from '@/utils/konva/text';
import type { Slide } from '@/utils/types';

/**
 * Sets a container ID for each text element that is contained within another
 * element.
 *
 * This function **mutates** the elements in the array and returns a reference
 * to the same array.
 */
export function setTextContainers(
  slides: Slide<CanvasElementWithAnimationAttributes>[]
) {
  slides.forEach((slide) => {
    slide.canvasElements.forEach((element, elementIndex) => {
      if (element.attributes.type !== 'text') return;

      const elementThatContainsText = getElementThatContainsText({
        slideElementsBeforeText: slide.canvasElements
          .map(({ attributes }) => attributes)
          .slice(0, elementIndex),
        canvasTextElement: element.attributes,
      });

      element.animationAttributes.containerId = elementThatContainsText?.id;
    });
  });

  return slides;
}
