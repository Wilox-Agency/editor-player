import type { ElementType } from 'react';

import { Image, Video } from '@/components/konva/Image';
import { Text } from '@/components/konva/Text';
import type { CanvasElement } from '@/utils/types';

export const CanvasComponentByType = {
  video: Video,
  image: Image,
  text: Text,
} as const satisfies Record<CanvasElement['type'], ElementType>;
