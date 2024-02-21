import { getCanvasElementRect, getIntersectionRect } from './sizes';
import type { AddTextContainerId } from './sharedTypes';
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

export function setTextContainers<TElement extends CanvasElement>(
  slides: Slide<TElement>[]
) {
  type CanvasElementWithTextContainerId = AddTextContainerId<TElement>;

  return slides.map((slide) => {
    const mapped = slide.canvasElements.map(
      (canvasElement, canvasElementIndex) => {
        if (canvasElement.type !== 'text') return canvasElement;

        const elementThatContainsText = getElementThatContainsText({
          slideElementsBeforeText: slide.canvasElements.slice(
            0,
            canvasElementIndex
          ),
          canvasTextElement: canvasElement,
        });

        return {
          ...canvasElement,
          containerId: elementThatContainsText?.id,
        };
      }
    ) as CanvasElementWithTextContainerId[];

    return { ...slide, canvasElements: mapped };
  });
}
