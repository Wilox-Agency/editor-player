import Konva from 'konva';
import type { IRect } from 'konva/lib/types';

import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

export function getTextSize(canvasTextElement: CanvasElementOfType<'text'>) {
  const textNode = new Konva.Text(canvasTextElement);
  return textNode.size();
}

export function getCanvasElementRect(canvasElement: CanvasElement) {
  const size =
    canvasElement.type === 'text'
      ? getTextSize(canvasElement)
      : {
          width: canvasElement.width || 0,
          height: canvasElement.height || 0,
        };

  return {
    x: canvasElement.x || 0,
    y: canvasElement.y || 0,
    ...size,
  };
}

export function getIntersectionRect(firstShape: IRect, secondShape: IRect) {
  const { leftMostShape, rightMostShape } =
    firstShape.x <= secondShape.x
      ? { leftMostShape: firstShape, rightMostShape: secondShape }
      : { leftMostShape: secondShape, rightMostShape: firstShape };
  const xDifference = rightMostShape.x - leftMostShape.x;
  const intersectionWidth = leftMostShape.width - xDifference;

  const { topMostShape, bottomMostShape } =
    firstShape.y <= secondShape.y
      ? { topMostShape: firstShape, bottomMostShape: secondShape }
      : { topMostShape: secondShape, bottomMostShape: firstShape };
  const yDifference = bottomMostShape.y - topMostShape.y;
  const intersectionHeight = topMostShape.height - yDifference;

  return { width: intersectionWidth, height: intersectionHeight };
}
