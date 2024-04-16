import type { AssetType } from './asset';
import { type colorThemeNames } from './color';
import { type srtSubtitlesSchema } from './parse';
import type { JsUnion } from '@/utils/types';

export type Dimension = 'width' | 'height';
export type Size = Record<Dimension, number>;
export type Coordinate = 'x' | 'y';
export type Position = Record<Coordinate, number>;

export type AudioWithStartEnd = { url: string } & JsUnion<
  unknown,
  { start: number; end: number }
>;

export type SrtSubtitles = (typeof srtSubtitlesSchema)['infer'];

export type SlideshowContent = {
  title: string;
  asset: { type: AssetType; url: string };
  audioUrl?: string;
  colorThemeName?: (typeof colorThemeNames)[number];
  backgroundMusicUrl?: string | null;
  slides: {
    title: string;
    paragraphs: string[];
    asset: { type: AssetType; url: string };
    audios?:
      | readonly [{ url: string }]
      | { url: string; start: number; end: number }[];
  }[];
};
