export const MouseButton = { left: 0, middle: 1, right: 2 } as const;

/**
 * Checks if the keyboard event has the meta (command; for Apple devices) or
 * ctrl modifier (for any other device)
 */
export function checkCtrlOrMetaModifier(event: KeyboardEvent) {
  /**
   * @see https://stackoverflow.com/questions/10527983/best-way-to-detect-mac-os-x-or-windows-computers-with-javascript-or-jquery
   */
  const platform =
    'userAgentData' in navigator
      ? (navigator.userAgentData as { platform: string }).platform
      : navigator.platform;
  const isAppleDevice = /(Mac|iPhone|iPod|iPad)/i.test(platform);

  const hasCtrlOrMetaModifier = isAppleDevice ? event.metaKey : event.ctrlKey;
  return hasCtrlOrMetaModifier;
}
