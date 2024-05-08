import { toast } from 'sonner';

import { showWarningToastWhenAssetLoadingTakesTooLong } from '@/utils/toast';
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

async function preloadAsset(type: 'image' | 'video', url: string) {
  const blobPromise = fetch(url).then((res) => res.blob());

  showWarningToastWhenAssetLoadingTakesTooLong(type, blobPromise);

  const blob = await blobPromise;
  const blobUrl = URL.createObjectURL(blob);
  return blobUrl;
}

/** Mutates the canvas elements by replacing the URL of the images and videos
 * with blob URLs */
export async function preloadAssetsFromCanvasElements(
  canvasElements: CanvasElement[]
) {
  const assetElements = canvasElements.filter(
    (element): element is CanvasElementOfType<'image' | 'video'> => {
      const isAssetElement =
        element.type === 'video' || element.type === 'image';
      return isAssetElement;
    }
  );
  const preloadAssetPromises = assetElements.map((element) => {
    return preloadAsset(
      element.type,
      element.type === 'image' ? element.imageUrl : element.videoUrl
    );
  });
  const preloadAssetsPromise = Promise.allSettled(preloadAssetPromises);

  toast.promise(preloadAssetsPromise, {
    loading: 'Preloading videos and images...',
    success: (results) => {
      const numberOfSuccesses = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const totalOfResults = results.length;

      if (numberOfSuccesses === totalOfResults) {
        return 'All videos and images preloaded successfully!';
      }
      return `${numberOfSuccesses} videos and images preloaded out of ${totalOfResults}.`;
    },
    error: 'Could not videos and images.',
  });

  const results = await preloadAssetsPromise;
  for (const [assetIndex, result] of results.entries()) {
    const canvasAssetElement = assetElements[assetIndex]!;
    // If the asset could be preloaded, use its new blob URL
    if (result.status === 'fulfilled') {
      if (canvasAssetElement.type === 'image') {
        canvasAssetElement.imageUrl = result.value;
      } else {
        canvasAssetElement.videoUrl = result.value;
      }
    }
  }
}
