// BaseGeometryModule.ts
// Abstract base class for all curriculum geometry modules.
// Each module encapsulates a single TEKS "story": its coordinate geometry,
// its mathematical validation, and its label-placement logic.

export interface CartesianPoint {
  x: number;
  y: number;
}

export interface LabeledPoint extends CartesianPoint {
  label: string;
  /** Signed pixel offset applied when rendering the label — already accounts
   *  for the direction from the diagram center to avoid line collision. */
  offsetX: number;
  offsetY: number;
}

export abstract class BaseGeometryModule {
  /** SVG viewBox center shared by all subclasses */
  protected readonly cx: number;
  protected readonly cy: number;

  constructor(cx = 100, cy = 100) {
    this.cx = cx;
    this.cy = cy;
  }

  /**
   * Return true when the geometry encoded in this instance is mathematically
   * valid (e.g. arc angles sum < 360°, triangle inequality holds, r < R).
   */
  abstract validate(): boolean;

  /**
   * Return the key SVG Cartesian points for this geometry instance.
   * Used by diagram renderers; callers should not assume a fixed length.
   */
  abstract calculateCoordinates(): CartesianPoint[];

  /**
   * Generate a label position using polar-offset logic so the label text
   * does not collide with the line connecting the labeled point to the center.
   *
   * Strategy: push the label radially outward from the diagram center by
   * `pushRadius` SVG units along the direction (point → center).
   */
  generateLabel(
    x: number,
    y: number,
    label: string,
    pushRadius = 14,
  ): LabeledPoint {
    const dx = x - this.cx;
    const dy = y - this.cy;
    const mag = Math.hypot(dx, dy);
    if (mag < 0.01) {
      // Point is at center — push straight up by convention
      return { x, y, label, offsetX: 0, offsetY: -pushRadius };
    }
    return {
      x,
      y,
      label,
      offsetX: (dx / mag) * pushRadius,
      offsetY: (dy / mag) * pushRadius,
    };
  }

  /**
   * Convert polar (r, θ) to SVG Cartesian coordinates using clock convention:
   * 0° = top of circle, angles increase clockwise.
   */
  protected polarToCart(r: number, thetaDeg: number): CartesianPoint {
    const rad = ((thetaDeg - 90) * Math.PI) / 180;
    return {
      x: this.cx + r * Math.cos(rad),
      y: this.cy + r * Math.sin(rad),
    };
  }

  /** Round n to the nearest 0.5 — produces "clean" classroom values */
  static roundToHalf(n: number): number {
    return Math.round(n * 2) / 2;
  }

  /** Round n to the nearest integer */
  static roundToInt(n: number): number {
    return Math.round(n);
  }
}
