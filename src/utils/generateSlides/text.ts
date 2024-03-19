import type { IRect } from 'konva/lib/types';

import { getCanvasTextWidth } from '@/utils/konva/text';
import { TextSizes } from '@/utils/validation';
import type { CanvasElementOfType } from '@/utils/types';

type TextType = 'title' | 'paragraph';

export const baseAttributesByTextType = {
  title: {
    fontFamily: 'Arial',
    fontSize: 80,
    lineHeight: 1,
    letterSpacing: -4,
    fontStyle: 'bold',
  },
  paragraph: {
    fontFamily: 'Arial',
    fontSize: 32,
    lineHeight: 1,
    letterSpacing: 0,
    fontStyle: '',
  },
} satisfies Record<TextType, Parameters<typeof fitTextIntoRect>[1]>;

export function fitTextIntoRect(
  text: string,
  textAttributes: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontStyle: string;
  },
  rect: { width: number; height: number }
): { width: number; height: number; fontSize: number } {
  const lines = text.split('\n');
  const lineHeightInPixels =
    textAttributes.lineHeight * textAttributes.fontSize;
  let currentTextWidth = 0;
  let currentTextHeight = 0;
  const textArr: { text: string; width: number }[] = [];

  /** If there's more lines and there's no space for them, decrease the font
  size, unless the font size is already at the minimum */
  function tryAgainWithSmallerFontSize() {
    if (textAttributes.fontSize <= TextSizes.minFontSize) {
      throw new Error('Cannot fit text into rect even with minimum font size.');
    }

    return fitTextIntoRect(
      text,
      {
        ...textAttributes,
        /* TODO: Instead of reducing font size by 1 pixel at a time, use binary
        search with the minimum font size as the start and the current font size
        as the end */
        fontSize: Math.max(textAttributes.fontSize - 1, TextSizes.minFontSize),
      },
      rect
    );
  }

  for (let line of lines) {
    if (currentTextHeight + lineHeightInPixels > rect.height) {
      return tryAgainWithSmallerFontSize();
    }

    let lineWidth = getCanvasTextWidth(line, textAttributes);
    // If line doesn't fit entirely, break the line into mutiple fitting ones
    if (lineWidth > rect.width) {
      while (line.length > 0) {
        let low = 0;
        let high = line.length;
        let match = '';
        let matchWidth = 0;

        if (currentTextHeight + lineHeightInPixels > rect.height) {
          return tryAgainWithSmallerFontSize();
        }

        /* Use binary search to find the longest substring that would fit in the
        specified width */
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          const substr = line.slice(0, mid + 1);
          const substrWidth = getCanvasTextWidth(substr, textAttributes);

          if (substrWidth <= rect.width) {
            low = mid + 1;
            match = substr;
            matchWidth = substrWidth;
          } else {
            high = mid;
          }
        }

        /* Now, `low` is the index right after the substring end, `match` is the
        substring, and `matchWidth` is the width of the substring in pixels */

        /* Not even a single character could fit within the rects width, which
        should never happen, but it's being handled for good measure */
        if (!match) {
          throw new Error('Cannot fit any character in the rect width');
        }

        // Try to find a space or dash where wrapping could be done
        let wrapIndex;
        const nextChar = line[match.length];
        const nextIsSpaceOrDash = nextChar === ' ' || nextChar === '-';
        if (nextIsSpaceOrDash && matchWidth <= rect.width) {
          wrapIndex = match.length;
        } else {
          wrapIndex =
            Math.max(match.lastIndexOf(' '), match.lastIndexOf('-')) + 1;
        }
        if (wrapIndex > 0) {
          // Re-cut the substring found at the space/dash position
          low = wrapIndex;
          match = match.slice(0, low);
          matchWidth = getCanvasTextWidth(match, textAttributes);
        }

        match = match.trimEnd();
        textArr.push({
          text: match,
          width: getCanvasTextWidth(match, textAttributes),
        });
        currentTextWidth = Math.max(currentTextWidth, matchWidth);
        currentTextHeight += lineHeightInPixels;

        line = line.slice(low);
        line = line.trimStart();
        if (line.length > 0) {
          // Check if the remaining text would fit on one line
          lineWidth = getCanvasTextWidth(line, textAttributes);
          if (lineWidth <= rect.width) {
            if (currentTextHeight + lineHeightInPixels > rect.height) {
              return tryAgainWithSmallerFontSize();
            }

            // If it does, add the line and break out of the loop
            textArr.push({
              text: line,
              width: getCanvasTextWidth(line, textAttributes),
            });
            currentTextHeight += lineHeightInPixels;
            currentTextWidth = Math.max(currentTextWidth, lineWidth);
            break;
          }
        }
      }
    } else {
      textArr.push({
        text: line,
        width: getCanvasTextWidth(line, textAttributes),
      });
      currentTextHeight += lineHeightInPixels;
      currentTextWidth = Math.max(currentTextWidth, lineWidth);
    }
  }

  return {
    width: currentTextWidth,
    height: currentTextHeight,
    fontSize: textAttributes.fontSize,
  };
}

export function generateTextAttributes(
  text: { type: TextType; value: string },
  containingRect: IRect
) {
  const padding = 40;
  const baseAttributes = baseAttributesByTextType[text.type];
  const { width, height, fontSize } = fitTextIntoRect(
    text.value,
    baseAttributes,
    {
      width: containingRect.width - padding * 2,
      height: containingRect.height - padding * 2,
    }
  );

  const textAttributes = {
    ...baseAttributes,
    id: crypto.randomUUID(),
    type: 'text',
    text: text.value,
    x: containingRect.x + containingRect.width / 2 - width / 2,
    y: containingRect.y + containingRect.height / 2 - height / 2,
    width,
    fontSize,
  } satisfies CanvasElementOfType<'text'>;

  return textAttributes;
}
