export interface FittedFont {
  font: string;
  spacing: number;
}

/** Total width of glyphs plus the letter spacing between them. */
export function spacedTextWidth(widths: readonly number[], spacing: number): number {
  if (widths.length === 0) return 0;
  return widths.reduce((sum, width) => sum + width, 0) + spacing * (widths.length - 1);
}

/** Left edges for glyphs drawn as one centered, letter-spaced run. */
export function centeredGlyphStarts(
  widths: readonly number[],
  spacing: number,
  centerX: number,
): number[] {
  let cursor = centerX - spacedTextWidth(widths, spacing) / 2;
  return widths.map((width) => {
    const start = cursor;
    cursor += width + spacing;
    return start;
  });
}

/**
 * Draw letter-spaced text centered on x. Glyphs are drawn left-aligned so the
 * measured widths line up with the canvas positions; center alignment would
 * shift the run left by half a glyph and clip the first letter.
 */
export function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
): void {
  const glyphs = [...text];
  const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
  const starts = centeredGlyphStarts(widths, spacing, x);

  ctx.save();
  ctx.textAlign = 'left';
  for (let i = 0; i < glyphs.length; i += 1) {
    ctx.fillText(glyphs[i], starts[i], y);
  }
  ctx.restore();
}

/**
 * Shrink a font and its letter spacing until the measured run fits maxWidth.
 * Font strings without a pixel size are left untouched.
 */
export function fitFontToWidth(
  font: string,
  spacing: number,
  measuredWidth: number,
  maxWidth: number,
): FittedFont {
  if (measuredWidth <= maxWidth || measuredWidth <= 0) {
    return { font, spacing };
  }

  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  if (!match) return { font, spacing };

  const scale = maxWidth / measuredWidth;
  const size = Number(match[1]) * scale;
  return {
    font: font.replace(/(\d+(?:\.\d+)?)px/, `${size.toFixed(2)}px`),
    spacing: spacing * scale,
  };
}
