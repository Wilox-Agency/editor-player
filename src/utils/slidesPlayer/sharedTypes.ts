import { CanvasElement } from '@/utils/types';

export type CanvasElementWithSharedId = CanvasElement & { sharedId?: string };

export type AddTextContainerId<TElement extends CanvasElement> =
  TElement extends { type: 'text' }
    ? TElement & { containerId?: string }
    : TElement;
