import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

export function prefetchAsset(type: 'image' | 'video', url: string) {
  const element = document.createElement(type === 'image' ? 'img' : 'video');
  element.src = url;
}

export function prefetchAssets(
  assets: { type: 'image' | 'video'; url: string }[]
) {
  const prefetchedAssets: string[] = [];
  assets.forEach((asset) => {
    const assetWasAlreadyPrefetched = prefetchedAssets.includes(asset.url);
    if (assetWasAlreadyPrefetched) return;

    prefetchAsset(asset.type, asset.url);
    prefetchedAssets.push(asset.url);
  });
}

export function prefetchAssetsFromCanvasElements(
  canvasElements: CanvasElement[]
) {
  const assetElements = canvasElements.filter(
    (element): element is CanvasElementOfType<'image' | 'video'> => {
      const isAssetElement =
        element.type === 'video' || element.type === 'image';
      return isAssetElement;
    }
  );
  const assets = assetElements.map((element) => {
    return {
      type: element.type,
      url: element.type === 'image' ? element.imageUrl : element.videoUrl,
    };
  });

  prefetchAssets(assets);
}
