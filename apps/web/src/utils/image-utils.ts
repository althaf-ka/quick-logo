/**
 * Generate a valid .ico file from a PNG buffer
 */
export function createIcoFromPng(
  pngBuffer: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const icoBuffer = new Uint8Array(22 + pngBuffer.length);
  const view = new DataView(icoBuffer.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  view.setUint8(6, width >= 256 ? 0 : width);
  view.setUint8(7, height >= 256 ? 0 : height);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBuffer.length, true);
  view.setUint32(18, 22, true);

  icoBuffer.set(pngBuffer, 22);

  return icoBuffer;
}
