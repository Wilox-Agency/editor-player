import { forwardRef, useContext, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

import { useVideo } from '@/hooks/useVideo';
import { KonvaContext } from '@/contexts/KonvaContext';
import type {
  CanvasElementOfType,
  RemoveIndex,
  UncroppedImageRect,
} from '@/utils/types';
import { mergeRefs } from '@/utils/mergeRefs';

type PrimitiveImageProps = Pick<
  RemoveIndex<Konva.ImageConfig>,
  'id' | 'image' | 'x' | 'y' | 'width' | 'height' | 'crop'
> & {
  uncroppedImageRect?: UncroppedImageRect;
  saveAttrs: CanvasElementOfType<'image'>['saveAttrs'];
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
            xWithinImage: uncroppedImageRect.xWithinImage * image.scaleX(),
            yWithinImage: uncroppedImageRect.yWithinImage * image.scaleY(),
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
};

export function Image({ imageUrl, ...props }: ImageProps) {
  const [imageElement] = useImage(imageUrl);

  return <PrimitiveImage {...props} image={imageElement} />;
}

export type VideoProps = Omit<PrimitiveImageProps, 'image'> & {
  videoUrl: string;
  autoPlay?: boolean;
};

export function Video({ videoUrl, autoPlay, ...props }: VideoProps) {
  const { layerRef } = useContext(KonvaContext);
  const videoRef = useRef<Konva.Image>(null);

  const [video, videoStatus] = useVideo(videoUrl, { layerRef, videoRef });

  useEffect(() => {
    if (autoPlay && videoStatus === 'loaded') {
      video.play();
    }
  }, [autoPlay, video, videoStatus]);

  return <PrimitiveImage {...props} image={video} ref={videoRef} />;
}
