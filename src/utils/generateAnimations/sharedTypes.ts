import type { MergeDeep } from 'type-fest';

import type {
  AddMissingKeysAsOptionalUndefined,
  CanvasElement,
  DistributiveKeyOf,
} from '@/utils/types';

export type AnimationStates = Partial<{
  from: Record<string, string | number>;
  to: Record<string, string | number>;
}>;

export type AnimationWithoutTimings = {
  type: 'morph' | 'enter' | 'exit' | 'morphAppear' | 'appear' | 'disappear';
  groupAnimation?: AnimationStates;
  nodeAnimation?: AnimationStates;
};

export type Animation = AnimationWithoutTimings & {
  duration: number;
  startTime: number;
};

type AnimationAttributesByElementType = MergeDeep<
  {
    // Common attributes
    [TType in CanvasElement['type']]: {
      enterDelay?: number;
      sharedWithPreviousSlide?: {
        sharedId: string;
        animationType: 'morph' | 'slideIn' | 'none';
      };
      sharedWithNextSlide?: {
        sharedId: string;
        animationType: 'morph' | 'slideIn' | 'none';
      };
    };
  },
  // Attributes specific to each element type
  { text: { containerId?: string } }
>;

type AnimationAttributeKey = DistributiveKeyOf<
  AnimationAttributesByElementType[keyof AnimationAttributesByElementType]
>;

export type CanvasElementWithAnimationAttributes<
  T extends CanvasElement = CanvasElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = T extends any
  ? {
      attributes: T;
      animationAttributes: AddMissingKeysAsOptionalUndefined<
        AnimationAttributesByElementType[T['type']],
        AnimationAttributeKey
      >;
    }
  : never;

export type CanvasElementWithAnimationsWithoutTimings =
  CanvasElementWithAnimationAttributes & {
    animations?: AnimationWithoutTimings[];
  };

export type CanvasElementWithAnimations =
  CanvasElementWithAnimationAttributes & {
    animations?: Animation[];
  };
