// Helper function to convert hex color to rgba
export const hexToRgba = (hex: string, opacity: number): string => {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse hex values
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
