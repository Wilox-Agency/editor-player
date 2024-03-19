import Konva from 'konva';

import { getCanvasElementRect, getIntersectionRect } from '@/utils/konva/rect';
import { findLast } from '@/utils/array';
import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

export function getCanvasTextWidth(
  lineOrLines: string | string[],
  {
    fontFamily,
    fontSize,
    letterSpacing,
    fontStyle,
  }: {
    fontFamily: string;
    fontSize: number;
    letterSpacing: number;
    fontStyle: string;
  }
) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;

  const lines = typeof lineOrLines === 'string' ? [lineOrLines] : lineOrLines;
  const width = Math.max(
    ...lines.map((line) => {
      const widthWithoutLetterSpacing = ctx.measureText(line).width;
      /* This width does not include the spacing added (or removed, if letter
      spacing is negative) after the last character of each line, as it doesn't
      fit the apparent width of the text and doesn't affect the format of the
      text (only in Konva, that's not true for HTML+CSS) and therefore should
      not be considered */
      const letterSpacingWidth =
        lineOrLines.length > 0 ? letterSpacing * (lineOrLines.length - 1) : 0;
      return widthWithoutLetterSpacing + letterSpacingWidth;
    })
  );

  canvas.remove();

  return width;
}

export function getTextSize(canvasTextElement: CanvasElementOfType<'text'>) {
  const textNode = new Konva.Text(canvasTextElement);
  return textNode.size();
}

export function getElementThatContainsText<TElement extends CanvasElement>({
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
 * Gets the minimum text node width for the current text format (i.e. without
 * creating any new lines or changing the position of any word). Optionally pass
 * different text attributes to get the minimum width for a text with different
 * attributes than the current one.
 */
export function getMinTextNodeWidthForCurrentTextFormat(
  textNode: Konva.Text,
  {
    fontFamily = textNode.fontFamily(),
    fontSize = textNode.fontSize(),
    letterSpacing = textNode.letterSpacing(),
    fontStyle = textNode.fontStyle(),
  } = {}
) {
  const lines = textNode.textArr.map((line) => line.text);
  return getCanvasTextWidth(lines, {
    fontFamily,
    fontSize,
    fontStyle,
    letterSpacing,
  });
}

/**
 * Gets the minimum `textarea` width for the current format of a text node (i.e.
 * without creating any new lines or changing the position of any word).
 * Optionally pass different text node attributes to get the minimum width for a
 * text node with different attributes than the given one.
 */
export function getMinTextAreaWidthForCurrentTextFormat(
  textNode: Konva.Text,
  {
    fontFamily = textNode.fontFamily(),
    fontSize = textNode.fontSize(),
    letterSpacing = textNode.letterSpacing(),
    fontStyle = textNode.fontStyle(),
  } = {}
) {
  const textElement = document.createElement('p');

  // Reset all styles
  textElement.style.all = 'unset';
  // Make it inaccessible
  textElement.setAttribute('aria-hidden', 'true');
  // Prevent it from affecting the layout and vice-versa
  textElement.style.position = 'absolute';
  // Make it invisible
  textElement.style.opacity = '0';
  textElement.style.clipPath = 'rect(0, 0, 0, 0)';

  // Set the styles used by the text node
  textElement.style.fontFamily = fontFamily;
  textElement.style.fontSize = `${fontSize}px`;
  if (fontStyle.includes('bold')) {
    textElement.style.fontWeight = 'bold';
  }
  if (fontStyle.includes('italic')) {
    textElement.style.fontStyle = 'italic';
  }
  textElement.style.letterSpacing = `${letterSpacing}px`;

  // Get the text width then remove the element
  document.body.append(textElement);
  const minWidth = Math.max(
    ...textNode.textArr.map((textLine) => {
      textElement.innerText = textLine.text;
      return textElement.getBoundingClientRect().width;
    })
  );
  textElement.remove();

  return minWidth;
}

/**
 * Gets the multiplier of how much the text width will change when changing some
 * of the attributes of a given text node.
 */
export function getTextWidthChangeMultiplier(
  textNode: Konva.Text,
  {
    fontFamily = textNode.fontFamily(),
    fontSize = textNode.fontSize(),
    letterSpacing = textNode.letterSpacing(),
    fontStyle = textNode.fontStyle(),
  }
) {
  const currentMinTextWidth = getMinTextNodeWidthForCurrentTextFormat(textNode);
  const newMinTextWidth = getMinTextNodeWidthForCurrentTextFormat(textNode, {
    fontSize,
    letterSpacing,
    fontStyle,
    fontFamily,
  });

  return newMinTextWidth / currentMinTextWidth;
}

/**
 * Returns a boolean that tells if a given text node is using automatic width
 * (which makes the width fit the text).
 */
export function getIsAutoTextWidth(textNode: Konva.Text) {
  return textNode.attrs.width === undefined || textNode.attrs.width === 'auto';
}
