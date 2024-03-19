export function getCanvasImageIntrinsicSize(imageSource: CanvasImageSource): {
  width: number;
  height: number;
} {
  if (imageSource instanceof HTMLImageElement) {
    return {
      width: imageSource.naturalWidth,
      height: imageSource.naturalHeight,
    };
  }

  if (imageSource instanceof SVGImageElement) {
    return {
      width: imageSource.width.baseVal.value,
      height: imageSource.height.baseVal.value,
    };
  }

  if (imageSource instanceof HTMLVideoElement) {
    return { width: imageSource.videoWidth, height: imageSource.videoHeight };
  }

  if (imageSource instanceof VideoFrame) {
    return {
      width: imageSource.displayWidth,
      height: imageSource.displayHeight,
    };
  }

  return { width: imageSource.width, height: imageSource.height };
}
