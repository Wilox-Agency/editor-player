import type { IRect } from 'konva/lib/types';

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
