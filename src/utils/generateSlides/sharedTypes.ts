import type { AssetType } from './asset';

export type Dimension = 'width' | 'height';
export type Size = Record<Dimension, number>;
export type Coordinate = 'x' | 'y';
export type Position = Record<Coordinate, number>;

export type SlideshowContent = {
  title: string;
  asset: { type: AssetType; url: string };
  slides: {
    title: string;
    paragraphs: string[];
    asset: { type: AssetType; url: string };
  }[];
};
