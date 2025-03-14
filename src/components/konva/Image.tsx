import { RefObject, forwardRef, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { useVideo } from '@/hooks/useVideo';
import { getCanvasImageIntrinsicSize } from '@/utils/konva/asset';
import { waitUntilKonvaNodeSizeIsCalculated } from '@/utils/konva/misc';
import { mergeRefs } from '@/utils/mergeRefs';
import type {
  CanvasElementOfTypeWithActions,
  RemoveIndex,
  UncroppedImageRect,
} from '@/utils/types';

type PrimitiveImageProps = Pick<
  RemoveIndex<Konva.ImageConfig>,
  'id' | 'image' | 'x' | 'y' | 'width' | 'height' | 'crop' | 'draggable'
> & {
  uncroppedImageRect?: UncroppedImageRect;
  saveAttrs: CanvasElementOfTypeWithActions<'image'>['saveAttrs'];
  remove: () => void;
};

export const PrimitiveImage = forwardRef<Konva.Image, PrimitiveImageProps>(
  (
    {
      id,
      image: imageElement,
      uncroppedImageRect,
      saveAttrs,
      ...initialAttributes
    },
    forwardedRef
  ) => {
    const imageRef = useRef<Konva.Image>(null);

    function handleImageTransformEnd(event: Konva.KonvaEventObject<Event>) {
      const image = event.target as Konva.Image;

      if (uncroppedImageRect) {
        // Saving the uncropped image rect for the new size
        saveAttrs({
          uncroppedImageRect: {
            cropXWithScale: uncroppedImageRect.cropXWithScale * image.scaleX(),
            cropYWithScale: uncroppedImageRect.cropYWithScale * image.scaleY(),
            width: uncroppedImageRect.width * image.scaleX(),
            height: uncroppedImageRect.height * image.scaleY(),
          },
        });
      }

      // Updating the size according to the scale, while also resetting the scale
      image.setAttrs({
        width: image.width() * image.scaleX(),
        height: image.height() * image.scaleY(),
        scaleX: 1,
        scaleY: 1,
      } satisfies Partial<Konva.ImageConfig>);
      // Saving the new position and size
      saveAttrs({
        x: image.x(),
        y: image.y(),
        width: image.width(),
        height: image.height(),
      });
    }

    function handleImageDragEnd(event: Konva.KonvaEventObject<DragEvent>) {
      // Saving the new position
      saveAttrs({ x: event.target.x(), y: event.target.y() });
    }

    // Setting the initial attributes only on the first render
    useEffect(() => {
      imageRef.current?.setAttrs(
        initialAttributes satisfies Partial<Konva.ImageConfig>
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <KonvaImage
        id={id}
        image={imageElement}
        onTransformEnd={handleImageTransformEnd}
        onDragEnd={handleImageDragEnd}
        ref={mergeRefs(imageRef, forwardedRef)}
      />
    );
  }
);

export type ImageProps = Omit<PrimitiveImageProps, 'image'> & {
  imageUrl: string;
  objectFit?: ObjectFit;
};

export function Image({ imageUrl, objectFit, ...props }: ImageProps) {
  const imageRef = useRef<Konva.Image>(null);

  const [imageElement, imageStatus] = useImage(imageUrl);
  useObjectFit({ imageNodeRef: imageRef, objectFit, loadStatus: imageStatus });

  return <PrimitiveImage {...props} image={imageElement} ref={imageRef} />;
}

export type VideoProps = Omit<PrimitiveImageProps, 'image'> & {
  videoUrl: string;
  autoPlay?: boolean;
  loop?: boolean;
  objectFit?: ObjectFit;
  muted?: boolean;
};

export function Video({
  videoUrl,
  autoPlay,
  loop = false,
  objectFit,
  muted = true,
  ...props
}: VideoProps) {
  const { layerRef } = useKonvaRefsStore();
  const videoRef = useRef<Konva.Image>(null);

  const [video, videoStatus] = useVideo(
    { src: videoUrl, muted },
    { layerRef, videoRef }
  );
  useObjectFit({ imageNodeRef: videoRef, objectFit, loadStatus: videoStatus });

  useEffect(() => {
    if (videoStatus === 'loaded') {
      /* In Chromium browsers the video is not shown when it's not played, so
      instead of only playing when `autoPlay` is true, always play the video,
      but pause if `autoPlay` is false */
      video.play();
      if (!autoPlay) {
        video.pause();
      }
    }
  }, [autoPlay, video, videoStatus]);

  useEffect(() => {
    video.loop = loop;
  }, [loop, video]);

  return <PrimitiveImage {...props} image={video} ref={videoRef} />;
}

type ObjectFit = 'stretch' | 'cover';

function useObjectFit({
  imageNodeRef,
  objectFit = 'stretch',
  loadStatus,
}: {
  imageNodeRef: RefObject<Konva.Image>;
  objectFit?: ObjectFit;
  loadStatus: 'loaded' | 'loading' | 'failed';
}) {
  useEffect(() => {
    async function setObjectFit() {
      if (loadStatus !== 'loaded') return;

      const image = imageNodeRef.current;
      if (!image || objectFit === 'stretch') return;

      const imageSource = image.image();
      if (!imageSource) return;

      await waitUntilKonvaNodeSizeIsCalculated(image);

      const originalImageSize = getCanvasImageIntrinsicSize(imageSource);
      const currentSize = image.size();

      const originalAspectRatio =
        originalImageSize.width / originalImageSize.height;
      const currentAspectRatio = currentSize.width / currentSize.height;

      if (currentAspectRatio >= originalAspectRatio) {
        const yMultiplier =
          originalImageSize.height / (image.width() / originalAspectRatio);
        const cropHeight = currentSize.height * yMultiplier;

        image.crop({
          x: 0,
          y: (originalImageSize.height - cropHeight) / 2,
          width: originalImageSize.width,
          height: cropHeight,
        });
      } else {
        const xMultiplier =
          originalImageSize.width / (image.height() * originalAspectRatio);
        const cropWidth = currentSize.width * xMultiplier;

        image.crop({
          x: (originalImageSize.width - cropWidth) / 2,
          y: 0,
          width: cropWidth,
          height: originalImageSize.height,
        });
      }
    }
    setObjectFit();
  }, [imageNodeRef, loadStatus, objectFit]);
}
