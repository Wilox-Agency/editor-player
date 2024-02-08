import 'react';

declare module 'react' {
  interface CSSProperties {
    // Allow setting CSS custom properties through `styles` attribute
    [key: `--${string}`]: string | number;
  }
}
