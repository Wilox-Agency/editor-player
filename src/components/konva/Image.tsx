import { forwardRef, useContext, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

import { CustomKonvaAttributes } from '@/utils/CustomKonvaAttributes';
import type { KonvaComponentProps, UncroppedImageRect } from '@/utils/types';
import { useVideo } from '@/hooks/useVideo';
import { KonvaContext } from '@/contexts/KonvaContext';

type PrimitiveImageProps = KonvaComponentProps<typeof KonvaImage>;

export const PrimitiveImage = forwardRef<Konva.Image, PrimitiveImageProps>(
  ({ onTransformEnd, ...props }, forwardedRef) => {
    function handleImageTransformEnd(event: Konva.KonvaEventObject<Event>) {
      const image = event.target as Konva.Image;

      const uncroppedImageRect = image.getAttr(
        CustomKonvaAttributes.uncroppedImageRect
      ) as UncroppedImageRect | undefined;
      if (uncroppedImageRect) {
        // Updating the uncropped image rect for the new size
        image.setAttr(CustomKonvaAttributes.uncroppedImageRect, {
          xWithinImage: uncroppedImageRect.xWithinImage * image.scaleX(),
          yWithinImage: uncroppedImageRect.yWithinImage * image.scaleY(),
          width: uncroppedImageRect.width * image.scaleX(),
          height: uncroppedImageRect.height * image.scaleY(),
        } satisfies UncroppedImageRect);
      }

      // Updating the size according to the scale, while also resetting the scale
      image.setAttrs({
        width: image.width() * image.scaleX(),
        height: image.height() * image.scaleY(),
        scaleX: 1,
        scaleY: 1,
      } satisfies Partial<Konva.ImageConfig>);

      onTransformEnd?.(event);
    }

    return (
      <KonvaImage
        {...props}
        onTransformEnd={handleImageTransformEnd}
        ref={forwardedRef}
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
