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

function getNodeById(
  id: string,
  parent: Konva.Group | Konva.Layer
): Konva.Node | undefined {
  for (const child of parent.getChildren()) {
    if (child.id() === id) return child;

    if (child instanceof Konva.Group) {
      const foundNode = getNodeById(id, child);
      if (foundNode) return foundNode;
    }
  }
}

/**
 * @throws If the node is **not an image node** or the canvas image source of
 * the node is **not a video element**.
 */
export function getVideoElementFromNodeId(
  id: string,
  parent: Konva.Group | Konva.Layer
) {
  const node = getNodeById(id, parent);
  if (!node) {
    throw new Error('Node not found.');
  }
  if (!(node instanceof Konva.Image)) {
    throw new Error('Node is not an image node.');
  }

  const canvasImageSource = node.image();
  if (!canvasImageSource) {
    throw new Error('Node does not contain a canvas image source.');
  }
  if (!(canvasImageSource instanceof HTMLVideoElement)) {
    throw new Error('Canvas image source of node is not a video element.');
  }

  return canvasImageSource;
}
