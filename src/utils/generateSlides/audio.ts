export function getAudioDuration(url: string) {
  return new Promise<number | undefined>((resolve, reject) => {
    const audioElement = document.createElement('audio');

    function handleLoad() {
      cleanup();

      const duration = audioElement.duration;
      if (isNaN(duration) || duration === Infinity) {
        reject('Audio duration is unknown.');
        return;
      }

      resolve(duration);
    }

    function handleError() {
      reject(`Invalid audio URL: "${url}"`);
      cleanup();
    }

    function cleanup() {
      audioElement.removeEventListener('loadedmetadata', handleLoad);
      audioElement.removeEventListener('error', handleError);
      audioElement.remove();
    }

    audioElement.addEventListener('loadedmetadata', handleLoad);
    audioElement.addEventListener('error', handleError);
    audioElement.src = url;
  });
}
