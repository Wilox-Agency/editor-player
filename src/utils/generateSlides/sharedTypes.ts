import type { AssetType } from './asset';
import { type colorThemeNames } from './colors';

export type Dimension = 'width' | 'height';
export type Size = Record<Dimension, number>;
export type Coordinate = 'x' | 'y';
export type Position = Record<Coordinate, number>;

export type SlideshowContent = {
  title: string;
  asset: { type: AssetType; url: string };
  audioUrl?: string;
  colorThemeName?: (typeof colorThemeNames)[number];
  backgroundMusicUrl?: string;
  slides: {
    title: string;
    paragraphs: string[];
    asset: { type: AssetType; url: string };
    audioUrl?: string;
  }[];
};
