export function validateUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}

export function validateAssetUrl(type: 'image' | 'video', url: string) {
  return new Promise<boolean>((resolve) => {
    const imageElement = document.createElement(
      type === 'image' ? 'img' : 'video'
    );
    const loadEventName = type === 'image' ? 'load' : 'loadedmetadata';

    function handleLoad() {
      resolve(true);
      cleanup();
    }

    function handleError() {
      resolve(false);
      cleanup();
    }

    function cleanup() {
      imageElement.removeEventListener(loadEventName, handleLoad);
      imageElement.removeEventListener('error', handleError);
      imageElement.remove();
    }

    imageElement.addEventListener(loadEventName, handleLoad);
    imageElement.addEventListener('error', handleError);
    imageElement.src = url;
  });
}
