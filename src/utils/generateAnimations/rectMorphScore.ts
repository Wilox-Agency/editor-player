import type { IRect } from 'konva/lib/types';

import { StageVirtualSize } from '@/utils/konva';
import { getRectWithAbsolutePosition } from '@/utils/konva/rect';

// function getIntersectionScore(firstShape: IRect, secondShape: IRect) {
//   const intersectionRect = getIntersectionRect(firstShape, secondShape);
//   const intersectionArea = intersectionRect.width * intersectionRect.height;

//   /* Calculate a score for each shape based on how much of the intersection area
//   covers the shape area */
//   const firstShapeIntersectionScore =
//     intersectionArea / (firstShape.width * firstShape.height);
//   const secondShapeIntersectionScore =
//     intersectionArea / (secondShape.width * secondShape.height);

//   // Calculate the mean of the scores
//   return (firstShapeIntersectionScore + secondShapeIntersectionScore) / 2;
// }

function getRectSizeScore(firstShape: IRect, secondShape: IRect) {
  const widthScore =
    firstShape.width > secondShape.width
      ? secondShape.width / firstShape.width
      : firstShape.width / secondShape.width;
  const heightScore =
    firstShape.height > secondShape.height
      ? secondShape.height / firstShape.height
      : firstShape.height / secondShape.height;

  // Calculate the mean of the scores
  return (widthScore + heightScore) / 2;
}

function getRectPositionScore(firstRect: IRect, secondRect: IRect) {
  const firstRectWithAbsolutePosition = getRectWithAbsolutePosition(firstRect);
  const secondRectWithAbsolutePosition =
    getRectWithAbsolutePosition(secondRect);

  /** Represents the smallest of the following: distance between lefts or
   * distance between rights */
  const smallestHorizontalPositionDistance = Math.min(
    Math.abs(
      firstRectWithAbsolutePosition.left - secondRectWithAbsolutePosition.left
    ),
    Math.abs(
      firstRectWithAbsolutePosition.right - secondRectWithAbsolutePosition.right
    )
  );
  /** Represents the smallest of the following: distance between tops or
   * distance between bottoms */
  const smallestVerticalPositionDistance = Math.min(
    Math.abs(
      firstRectWithAbsolutePosition.top - secondRectWithAbsolutePosition.top
    ),
    Math.abs(
      firstRectWithAbsolutePosition.bottom -
        secondRectWithAbsolutePosition.bottom
    )
  );

  const halfStageWidth = StageVirtualSize.width / 2;
  const halfStageHeight = StageVirtualSize.height / 2;

  // Note that these scores can be negative
  const horizontalPositionScore =
    1 - smallestHorizontalPositionDistance / halfStageWidth;
  const verticalPositionScore =
    1 - smallestVerticalPositionDistance / halfStageHeight;

  // Calculate the mean of the scores
  return (horizontalPositionScore + verticalPositionScore) / 2;
}

export function getRectMorphScore(firstShape: IRect, secondShape: IRect) {
  const rectSizeScore = getRectSizeScore(firstShape, secondShape);
  const rectPositionScore = getRectPositionScore(firstShape, secondShape);

  // Calculate the mean of the scores
  return (rectSizeScore + rectPositionScore) / 2;
}
