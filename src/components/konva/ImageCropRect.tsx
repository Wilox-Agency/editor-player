import { forwardRef } from 'react';
import Konva from 'konva';
import { Rect } from 'react-konva';

export const ImageCropRect = forwardRef<Konva.Rect>((_props, forwardedRef) => {
  function handleImageCropRectTransform(event: Konva.KonvaEventObject<Event>) {
    event.target.setAttrs({
      width: event.target.width() * event.target.scaleX(),
      height: event.target.height() * event.target.scaleY(),
      scaleX: 1,
      scaleY: 1,
    } satisfies Konva.RectConfig);
  }

  return (
    <Rect
      fill="rgb(14 165 233 / 0.25)"
      draggable
      visible={false}
      onTransform={handleImageCropRectTransform}
      ref={forwardedRef}
    />
  );
});
