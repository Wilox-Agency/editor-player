import Konva from 'konva';

import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

export function getTextHeight(canvasTextElement: CanvasElementOfType<'text'>) {
  const textNode = new Konva.Text(canvasTextElement);
  /* TODO: Test if the height is calculated immediately or I need to wait until
  it is calculated */
  return textNode.height();
}

export function getCanvasElementRect(canvasElement: CanvasElement) {
  return {
    x: canvasElement.x || 0,
    y: canvasElement.y || 0,
    width: canvasElement.width || 0,
    height:
      canvasElement.type === 'text'
        ? getTextHeight(canvasElement)
        : canvasElement.height || 0,
  };
}
