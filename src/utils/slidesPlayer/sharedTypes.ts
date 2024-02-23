import type { CanvasElement } from '@/utils/types';

export type AnimationStates = Partial<{
  from: Record<string, string | number>;
  to: Record<string, string | number>;
}>;

export type Animation = {
  type: 'morph' | 'enter' | 'exit' | 'appear' | 'disappear';
  duration: number;
  startTime: number;
  groupAnimation?: AnimationStates;
  nodeAnimation?: AnimationStates;
};

export type CanvasElementWithSharedId = CanvasElement & { sharedId?: string };

export type AddTextContainerId<TElement extends CanvasElement> =
  TElement extends { type: 'text' }
    ? TElement & { containerId?: string }
    : TElement;

export type AddEnterDelay<TElement extends CanvasElement> = TElement & {
  enterDelay?: number;
};

export type CanvasElementWithAnimations<TElement extends CanvasElement> = {
  attributes: TElement;
  animations?: Animation[];
};
