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
