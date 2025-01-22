import gsap from "gsap";
import { Contrast } from "@smockle/contrast";

import type { CanvasElement, CanvasElementOfType } from "@/utils/types";

export const colorThemeNames = [
  "default",
  "oxford",
  "twilight",
  "pastel",
  "vintage",
  "earthy",
  "royalTwilight",
  "boldContrast",
  "seaBreeze",
  "grupoDatco",
  "amuch",
] as const;

// Color names by https://coolors.co/
export const colorThemeOptions = {
  default: [
    "#000000", // Black
    "#D1A3F3", // Mauve (purple)
    "#28FA9D", // Spring green
    "#FFFC5A", // Icterine (yellow)
  ],
  oxford: [
    "#000000", // Black
    "#14213D", // Oxford Blue
    "#FCA311", // Orange
    "#E5E5E5", // Platinum (light gray)
    "#FFFFFF", // White
  ],
  twilight: [
    "#FBBBAD", // Melon (peach)
    "#EE8695", // Salmon pink
    "#4A7A96", // Cerulean (blue)
    "#333F58", // Delft Blue
    "#292831", // Raisin black
  ],
  pastel: [
    "#FF99C8", // Carnation pink
    "#FCF6BD", // Lemon chiffon (yellow)
    "#D0F4DE", // Nyanza (green)
    "#A9DEF9", // Uranian Blue
    "#E4C1F9", // Mauve (purple)
  ],
  vintage: [
    "#D7CEC7", // Timberwolf
    "#8C8A93", // Taupe Gray
    "#EAC67A", // Gold Sand
    "#C38D9E", // Puce
    "#41B3A3", // Mint
  ],
  earthy: [
    "#8B4513", // Saddle Brown
    "#CD853F", // Peru
    "#D2B48C", // Tan
    "#F4A460", // Sandy Brown
    "#FFE4C4", // Bisque
  ],
  boldContrast: [
    "#E63946", // Strong Red
    "#1D3557", // Dark Blue
    "#A8DADC", // Soft Aqua
    "#F1FAEE", // Off-White
    "#457B9D", // Muted Blue
  ],
  royalTwilight: [
    "#6A0572", // Royal Purple
    "#8A2BE2", // Blue Violet
    "#4C1D95", // Deep Indigo
    "#5B84B1", // Soft Blue
    "#C3B1E1", // Lavender
  ],
  seaBreeze: [
    "#2E8B57", // Sea Green
    "#20B2AA", // Light Sea Green
    "#4682B4", // Steel Blue
    "#87CEEB", // Sky Blue
    "#E0FFFF", // Light Cyan
  ],
  grupoDatco: [
    "#0e316e", // GD_main
    "#111b33", // GD_dark
    "#f0582b", // GD_highlight
    "#1f4483", // GD_sub
    "#ffb201", // GD_extra
  ],
  amuch: [
    "#1C0F0A", // Black
    "#243063", // Dark blue
    "#0080BA", // Blue
    "#E5E5E5", // Platinum (light gray)
    "#FFFFFF", // White
  ],
} as const satisfies Record<(typeof colorThemeNames)[number], string[]>;

const TextColors = {
  black: "#000000",
  white: "#ffffff",
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
    (element): element is CanvasElementOfType<"rect"> => {
      return element.type === "rect";
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
