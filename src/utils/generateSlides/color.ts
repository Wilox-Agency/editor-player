import gsap from 'gsap';
import { Contrast } from '@smockle/contrast';

import type { CanvasElement, CanvasElementOfType } from '@/utils/types';

export const colorThemeNames = [
  'default',
  'oxford',
  'twilight',
  'pastel',
] as const;

// Color names by https://coolors.co/
export const colorThemeOptions = {
  default: [
    '#000000', // Black
    '#D1A3F3', // Mauve (purple)
    '#28FA9D', // Spring green
    '#FFFC5A', // Icterine (yellow)
  ],
  oxford: [
    '#000000', // Black
    '#14213D', // Oxford Blue
    '#FCA311', // Orange
    '#E5E5E5', // Platinum (light gray)
    '#FFFFFF', // White
  ],
  twilight: [
    '#FBBBAD', // Melon (peach)
    '#EE8695', // Salmon pink
    '#4A7A96', // Cerulean (blue)
    '#333F58', // Delft Blue
    '#292831', // Raisin black
  ],
  pastel: [
    '#FF99C8', // Carnation pink
    '#FCF6BD', // Lemon chiffon (yellow)
    '#D0F4DE', // Nyanza (green)
    '#A9DEF9', // Uranian Blue
    '#E4C1F9', // Mauve (purple)
  ],
} as const satisfies Record<(typeof colorThemeNames)[number], string[]>;

const TextColors = {
  black: '#000000',
  white: '#ffffff',
} as const;

export function chooseTextColor(textContainerColor: string) {
  let colorAndContrast;
  for (const color of Object.values(TextColors)) {
    const contrast = new Contrast(color, textContainerColor).value;
    if (!colorAndContrast || colorAndContrast.contrast < contrast) {
      colorAndContrast = { color, contrast };
    }
  }

  return colorAndContrast!.color;
}

export function getUnusedRectColorsFromSlide(
  canvasElements: CanvasElement[],
  colorPalette: string[]
) {
  const rectElements = canvasElements.filter(
    (element): element is CanvasElementOfType<'rect'> => {
      return element.type === 'rect';
    }
  );
  const rectColors = rectElements.map((rect) => rect.fill);
  const unusedRectColors = colorPalette.filter(
    (color) => !rectColors.includes(color)
  );
  // Shuffle the colors to add some randomness
  gsap.utils.shuffle(unusedRectColors);

  return unusedRectColors;
}
