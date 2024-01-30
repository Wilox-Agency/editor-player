import { create } from 'zustand';
import { parseColor, type Color } from '@react-stately/color';
import { excludeKeys } from 'filter-obj';

type CanvasStyleState = {
  canvasBackgroundColor: Color;
};

export type CanvasStyleStateJson = {
  canvasBackgroundColor: string;
};

type CanvasStyleStore = CanvasStyleState & {
  changeCanvasBackgroundColor: (color: Color) => void;
  loadCanvasStyleFromJson: (style: CanvasStyleStateJson) => void;
  canvasStyleToJson: () => CanvasStyleStateJson;
};

export const useCanvasStyleStore = create<CanvasStyleStore>((set, get) => ({
  canvasBackgroundColor: parseColor('#242424').toFormat('hsb'),
  changeCanvasBackgroundColor: (color) => {
    set({ canvasBackgroundColor: color });
  },
  loadCanvasStyleFromJson: (style) => {
    set({
      canvasBackgroundColor: parseColor(style.canvasBackgroundColor).toFormat(
        'hsb'
      ),
    } satisfies CanvasStyleState);
  },
  canvasStyleToJson: () => {
    const state = excludeKeys(
      get(),
      (value) => typeof value === 'function'
    ) as CanvasStyleState;

    return {
      ...state,
      canvasBackgroundColor: state.canvasBackgroundColor.toString('hex'),
    } satisfies CanvasStyleStateJson;
  },
}));
