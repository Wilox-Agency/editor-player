import { type RefObject, useCallback, useEffect, useState } from 'react';
import Konva from 'konva';

import { useCanvasTreeStore } from '@/hooks/useCanvasTreeStore';
import { getCanvasImageIntrinsicSize } from '@/utils/getCanvasImageIntrinsicSize';
import { CustomKonvaAttributes } from '@/utils/CustomKonvaAttributes';
import type { CanvasElementOfType } from '@/utils/types';

export function useImageCropTransformer({
  transformerRef,
  cropTransformerRef,
  cropRectRef,
}: {
  transformerRef: RefObject<Konva.Transformer>;
  cropTransformerRef: RefObject<Konva.Transformer>;
  cropRectRef: RefObject<Konva.Rect>;
}) {
  const [imageBeingCropped, setImageBeingCropped] = useState<Konva.Image>();

  function handleStartCroppingImage(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    // Do nothing when not double clicking an image
    if (!(event.target instanceof Konva.Image)) return;

    startCroppingImage(event.target);
  }

  function handleFinishCroppingImage(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    const cropTransformer = cropTransformerRef.current;
    const cropRect = cropRectRef.current;
    if (!cropTransformer || !cropRect || !imageBeingCropped) return;

    if (
      event.target !== imageBeingCropped &&
      event.target.parent !== cropTransformer &&
      event.target !== cropRect
    ) {
      finishCroppingImage();
    }
  }

  function startCroppingImage(image: Konva.Image) {
    if (image.getAttr(CustomKonvaAttributes.unselectable) === true) return;

    const cropTransformer = cropTransformerRef.current;
    const cropRect = cropRectRef.current;
    if (!cropTransformer || !cropRect) return;

    const imageState = useCanvasTreeStore
      .getState()
      .canvasTree.find(
        (element) => element.id === image.id()
      ) as CanvasElementOfType<'image'>;
    let uncroppedImageRect = imageState.uncroppedImageRect;
    // Saving the uncropped image size if not saved already
    if (!uncroppedImageRect) {
      const currentImageRect = image.getClientRect();
      uncroppedImageRect = {
        cropXWithScale: 0,
        cropYWithScale: 0,
        width: currentImageRect.width,
        height: currentImageRect.height,
      };
      imageState.saveAttrs({ uncroppedImageRect });
    }
    // Clearing the current selection
    transformerRef.current?.nodes([]);
    // Setting the image as the one being cropped
    setImageBeingCropped(image);
    // Setting the crop rect position and size
    cropRect.setAttrs({
      x: image.x(),
      y: image.y(),
      width: image.width(),
      height: image.height(),
      visible: true,
      dragBoundFunc: (position) => {
        const positionWithConstraints = { ...position };

        // Limiting drag to the left of the image
        if (positionWithConstraints.x < image.x()) {
          positionWithConstraints.x = image.x();
        }

        // Limiting drag to the right of the image
        if (
          positionWithConstraints.x + cropRect.width() >
          image.x() + image.width()
        ) {
          positionWithConstraints.x =
            image.x() + image.width() - cropRect.width();
        }

        // Limiting drag to the top of the image
        if (positionWithConstraints.y < image.y()) {
          positionWithConstraints.y = image.y();
        }

        // Limiting drag to the bottom of the image
        if (
          positionWithConstraints.y + cropRect.height() >
          image.y() + image.height()
        ) {
          positionWithConstraints.y =
            image.y() + image.height() - cropRect.height();
        }

        return positionWithConstraints;
      },
    } satisfies Konva.RectConfig);

    image.setAttrs({
      // Resetting to the uncropped image position, size and crop
      x: image.x() - uncroppedImageRect.cropXWithScale,
      y: image.y() - uncroppedImageRect.cropYWithScale,
      width: uncroppedImageRect.width,
      height: uncroppedImageRect.height,
      crop: undefined,
      // Setting the image as unselectable and undraggable
      [CustomKonvaAttributes.unselectable]: true,
      draggable: false,
    } satisfies Partial<Konva.ImageConfig>);

    cropTransformer.setAttrs({
      boundBoxFunc: (oldBox, newBox) => {
        const boxWithConstraints = { ...newBox };
        const MIN_SIZE = 8;

        // Limiting width
        if (boxWithConstraints.width < MIN_SIZE) {
          boxWithConstraints.width = MIN_SIZE;
          // When resizing left to right
          if (newBox.x > oldBox.x) {
            boxWithConstraints.x = oldBox.x + oldBox.width - MIN_SIZE;
          }
        }

        // Limiting height
        if (boxWithConstraints.height < MIN_SIZE) {
          boxWithConstraints.height = MIN_SIZE;
          // When resizing top to bottom
          if (newBox.y > oldBox.y) {
            boxWithConstraints.y = oldBox.y + oldBox.height - MIN_SIZE;
          }
        }

        // Limiting transform to the left of the image
        if (boxWithConstraints.x < image.x()) {
          const difference = image.x() - boxWithConstraints.x;
          boxWithConstraints.x = image.x();
          boxWithConstraints.width -= difference;
        }

        const boxXWithinImage = boxWithConstraints.x - image.x();

        // Limiting transform to the right of the image
        if (boxXWithinImage + boxWithConstraints.width > image.width()) {
          boxWithConstraints.width = image.width() - boxXWithinImage;
          // if (boxXWithinImage > image.width()) {
          //   boxWithConstraints.x = image.x() + image.width();
          // }
        }

        // Limiting transform to the top of the image
        if (boxWithConstraints.y < image.y()) {
          const difference = image.y() - boxWithConstraints.y;
          boxWithConstraints.y = image.y();
          boxWithConstraints.height -= difference;
        }

        const boxYWithinImage = boxWithConstraints.y - image.y();

        // Limiting transform to the bottom of the image
        if (boxYWithinImage + boxWithConstraints.height > image.height()) {
          boxWithConstraints.height = image.height() - boxYWithinImage;
          // if (boxYWithinImage > image.height()) {
          //   boxWithConstraints.y = image.y() + image.height();
          // }
        }

        return boxWithConstraints;
      },
    } satisfies Konva.TransformerConfig);

    cropTransformer.nodes([cropRect]);
  }

  const finishCroppingImage = useCallback(() => {
    const cropTransformer = cropTransformerRef.current;
    const cropRect = cropRectRef.current;
    if (!cropTransformer || !cropRect || !imageBeingCropped) return;

    const imageState = useCanvasTreeStore
      .getState()
      .canvasTree.find(
        (element) => element.id === imageBeingCropped.id()
      ) as CanvasElementOfType<'image'>;
    const uncroppedImageRect = imageState.uncroppedImageRect;
    const imageSource = imageBeingCropped.image();
    if (!uncroppedImageRect || !imageSource) return;

    const originalImageSize = getCanvasImageIntrinsicSize(imageSource);
    /* When using the `crop` attribute in Konva.js, the crop position and size
    needs to be relative to the original image size, so these multipliers are
    used to convert position and size of the crop rect in the image's current
    size to the position and size it would have if the image was in its original
    size */
    const xMultiplier = originalImageSize.width / imageBeingCropped.width();
    const yMultiplier = originalImageSize.height / imageBeingCropped.height();

    // The X distance between the uncropped image and the cropped image
    const cropXWithScale = cropRect.x() - imageBeingCropped.x();
    // The Y distance between the uncropped image and the cropped image
    const cropYWithScale = cropRect.y() - imageBeingCropped.y();

    // Updating the cropped image
    imageBeingCropped.setAttrs({
      // Setting the new position, size and crop
      x: cropRect.x(),
      y: cropRect.y(),
      width: cropRect.width(),
      height: cropRect.height(),
      crop: {
        x: cropXWithScale * xMultiplier,
        y: cropYWithScale * yMultiplier,
        width: cropRect.width() * xMultiplier,
        height: cropRect.height() * yMultiplier,
      },
      // Setting the image as selectable and draggable again
      [CustomKonvaAttributes.unselectable]: undefined,
      draggable: true,
    } satisfies Partial<Konva.ImageConfig>);

    imageState.saveAttrs({
      // Saving the new position of the uncropped image rect
      uncroppedImageRect: {
        ...uncroppedImageRect,
        cropXWithScale,
        cropYWithScale,
      },
      // Saving the new position, size and crop
      x: imageBeingCropped.x(),
      y: imageBeingCropped.y(),
      width: imageBeingCropped.width(),
      height: imageBeingCropped.height(),
      crop: imageBeingCropped.crop(),
    });

    cropTransformer.nodes([]);
    cropRect.visible(false);
    setImageBeingCropped(undefined);
  }, [cropRectRef, cropTransformerRef, imageBeingCropped]);

  // Setup window event listeners for crop transformer
  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      const cropTransformer = cropTransformerRef.current;
      if (!cropTransformer) return;

      const someImageIsBeingCropped = imageBeingCropped !== undefined;
      // Finish cropping image when pressing Escape
      if (event.key === 'Escape' && someImageIsBeingCropped) {
        // Prevent leaving fullscreen
        event.preventDefault();
        finishCroppingImage();
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [cropTransformerRef, finishCroppingImage, imageBeingCropped]);

  return {
    /**
     * The `onDblClick`/`onDblTap` event handler to be used in your `Stage`
     * component from `react-konva`.
     */
    handleStartCroppingImage,
    startCroppingImage,
    /**
     * The `onMouseDown`/`onTouchStart` event handler to be used in your `Stage`
     * component from `react-konva`.
     */
    handleFinishCroppingImage,
  };
}
