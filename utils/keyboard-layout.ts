/** Window coordinates are used for both the input and the visible scroll area. */
export function inputScrollOffset({
  scrollY,
  viewportY,
  viewportHeight,
  inputY,
  inputHeight,
  bottomSpace = 72,
}: {
  scrollY: number;
  viewportY: number;
  viewportHeight: number;
  inputY: number;
  inputHeight: number;
  bottomSpace?: number;
}) {
  const top = viewportY + 12;
  const bottom = viewportY + viewportHeight - Math.min(bottomSpace, viewportHeight / 3);
  // A large multiline input must not push its own first line above the header.
  const visibleInputHeight = Math.min(inputHeight, Math.max(0, bottom - top));
  const delta = inputY < top
    ? inputY - top
    : Math.max(0, inputY + visibleInputHeight - bottom);
  return Math.max(0, scrollY + delta);
}

export function keyboardOverlap(viewportHeight: number, keyboardY: number) {
  // In adjustResize mode the Android window is already above the keyboard.
  // The event's keyboard height would count that space a second time.
  return Math.max(0, Math.min(viewportHeight, viewportHeight - keyboardY));
}
