import type { IRect } from 'konva/lib/types';

import { getTextSize } from '@/utils/konva/text';
import type { CanvasElement } from '@/utils/types';

export type RectWithAbsolutePosition = IRect & {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function getRectWithAbsolutePosition(rect: IRect) {
  return {
    ...rect,
    left: rect.x,
    right: rect.x + rect.width,
    top: rect.y,
    bottom: rect.y + rect.height,
  } satisfies RectWithAbsolutePosition;
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
  let intersectionWidth: number;
  const { shapeWithSmallestWidth, shapeWithGreatestWidth } =
    firstShape.width <= secondShape.width
      ? {
          shapeWithSmallestWidth: getRectWithAbsolutePosition(firstShape),
          shapeWithGreatestWidth: getRectWithAbsolutePosition(secondShape),
        }
      : {
          shapeWithSmallestWidth: getRectWithAbsolutePosition(secondShape),
          shapeWithGreatestWidth: getRectWithAbsolutePosition(firstShape),
        };
  if (
    shapeWithSmallestWidth.left >= shapeWithGreatestWidth.left &&
    shapeWithSmallestWidth.right <= shapeWithGreatestWidth.right
  ) {
    intersectionWidth = shapeWithSmallestWidth.width;
  } else {
    const { leftMostShape, rightMostShape } =
      firstShape.x <= secondShape.x
        ? { leftMostShape: firstShape, rightMostShape: secondShape }
        : { leftMostShape: secondShape, rightMostShape: firstShape };

    const leftMostShapeRightEdge = leftMostShape.x + leftMostShape.width;
    const rightMostShapeLeftEdge = rightMostShape.x;
    intersectionWidth = Math.max(
      0,
      leftMostShapeRightEdge - rightMostShapeLeftEdge
    );
  }

  let intersectionHeight;
  const { shapeWithSmallestHeight, shapeWithGreatestHeight } =
    firstShape.height <= secondShape.height
      ? {
          shapeWithSmallestHeight: getRectWithAbsolutePosition(firstShape),
          shapeWithGreatestHeight: getRectWithAbsolutePosition(secondShape),
        }
      : {
          shapeWithSmallestHeight: getRectWithAbsolutePosition(secondShape),
          shapeWithGreatestHeight: getRectWithAbsolutePosition(firstShape),
        };
  if (
    shapeWithSmallestHeight.top >= shapeWithGreatestHeight.top &&
    shapeWithSmallestHeight.bottom <= shapeWithGreatestHeight.bottom
  ) {
    intersectionHeight = shapeWithSmallestHeight.height;
  } else {
    const { topMostShape, bottomMostShape } =
      firstShape.y <= secondShape.y
        ? { topMostShape: firstShape, bottomMostShape: secondShape }
        : { topMostShape: secondShape, bottomMostShape: firstShape };

    const topMostShapeBottomEdge = topMostShape.y + topMostShape.height;
    const bottomMostShapeTopEdge = bottomMostShape.y;
    intersectionHeight = Math.max(
      0,
      topMostShapeBottomEdge - bottomMostShapeTopEdge
    );
  }

  return { width: intersectionWidth, height: intersectionHeight };
}
