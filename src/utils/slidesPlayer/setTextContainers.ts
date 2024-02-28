import { getCanvasElementRect, getIntersectionRect } from './sizes';
import type { CanvasElementWithAnimationAttributes } from './sharedTypes';
import { assertType } from './assert';
import { findLast } from '@/utils/array';
import type { CanvasElement, CanvasElementOfType, Slide } from '@/utils/types';

function getElementThatContainsText<TElement extends CanvasElement>({
  slideElementsBeforeText,
  canvasTextElement,
}: {
  slideElementsBeforeText: TElement[];
  canvasTextElement: CanvasElementOfType<'text'>;
}) {
  type NonTextElement = Extract<
    TElement,
    { type: Exclude<CanvasElement['type'], 'text'> }
  >;

  const nonTextElements = slideElementsBeforeText.filter(
    (canvasElement): canvasElement is NonTextElement => {
      return canvasElement.type !== 'text';
    }
  );

  const textRect = getCanvasElementRect(canvasTextElement);
  const elementThatContainsText = findLast(nonTextElements, (element) => {
    const elementRect = getCanvasElementRect(element);

    const intersectionRect = getIntersectionRect(elementRect, textRect);
    const intersectionArea = intersectionRect.width * intersectionRect.height;
    const textArea = textRect.width * textRect.height;

    const atLeast80PercentOfTextIsInsideElement =
      intersectionArea / textArea >= 0.8;
    return atLeast80PercentOfTextIsInsideElement;
  });

  return elementThatContainsText;
}

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
    slide.canvasElements.forEach((canvasElement, canvasElementIndex) => {
      if (canvasElement.attributes.type !== 'text') return;
      assertType(canvasElement, 'text');

      const elementThatContainsText = getElementThatContainsText({
        slideElementsBeforeText: slide.canvasElements
          .map(({ attributes }) => attributes)
          .slice(0, canvasElementIndex),
        canvasTextElement: canvasElement.attributes,
      });

      canvasElement.animationAttributes.containerId =
        elementThatContainsText?.id;
    });
  });

  return slides;
}
