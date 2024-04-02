import Konva from 'konva';

/**
 * When creating a Konva node, the size at which it will appear on the screen
 * might take a few milliseconds to calculate. This function checks the size of
 * the provided node until it is calculated (i.e. it is different from
 * `undefined` and from `0`) and then returns it.
 *
 * This function throws if the size is not calculated after 1s, though this
 * timeout is reset when the browser tab gets inactive.
 */
export function waitUntilKonvaNodeSizeIsCalculated(
  node: Konva.Node,
  delayInMilliseconds: number = 50
) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    let startTime = new Date().getTime();
    const maxWaitTime = 1000; // 1s
    let timeout: number;

    function handleVisibilityChange() {
      // Clear the timeout when the browser tab gets inactive...
      if (document.hidden) {
        clearTimeout(timeout);
        return;
      }
      // ...and reset the wait time after the tab gets active again
      // TODO: Set timeout again when document is not hidden anymore
      startTime = new Date().getTime();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const removeVisibilityListener = () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);

    function checkSize() {
      const currentTime = new Date().getTime();
      const timeElapsed = currentTime - startTime;
      // Rejecting after exceeding the maximum wait time
      if (timeElapsed >= maxWaitTime) {
        removeVisibilityListener();
        reject(new Error('Timeout'));
        return;
      }

      // Width and height can be `undefined` or `0`
      if (!node.width() || !node.height()) {
        // TODO: Do not set timeout when document is already hidden
        timeout = setTimeout(() => {
          checkSize();
        }, delayInMilliseconds);
        return;
      }

      removeVisibilityListener();
      resolve({ width: node.width(), height: node.height() });
    }

    setTimeout(() => {
      checkSize();
    });
  });
}

export function getAllVideoElementsFromNode(
  node: Konva.Node
): HTMLVideoElement[] {
  if (node instanceof Konva.Group || node instanceof Konva.Layer) {
    const children = node
      .getChildren()
      .filter((child): child is Konva.Image | Konva.Group => {
        return child instanceof Konva.Image || child instanceof Konva.Group;
      })
      .map((node) => getAllVideoElementsFromNode(node))
      .flat();
    return children;
  }

  if (node instanceof Konva.Image) {
    const canvasImageSource = node.image();
    const isVideoElement = canvasImageSource instanceof HTMLVideoElement;
    if (!isVideoElement) return [];

    return [canvasImageSource];
  }

  return [];
}
