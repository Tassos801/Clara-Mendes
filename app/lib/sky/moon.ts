/**
 * SVG path for the lit part of a moon disc of radius R centred at (cx, cy)
 * showing the lit fraction f (0..1). `litRight` puts the bright limb on the
 * right. Shared by the SVG preview and the PDF (via drawSvgPath).
 */
export function moonLitPath(
  cx: number,
  cy: number,
  R: number,
  f: number,
  litRight: boolean,
) {
  const frac = Math.max(0, Math.min(1, f));
  if (frac <= 0.005) return '';
  if (frac >= 0.995) {
    return `M ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy} Z`;
  }
  const top = `${cx} ${cy - R}`;
  const bottom = `${cx} ${cy + R}`;
  // Outer limb: the half circle on the lit side (sweep 1 = clockwise in SVG
  // = right-hand side when going top → bottom).
  const limb = `M ${top} A ${R} ${R} 0 0 ${litRight ? 1 : 0} ${bottom}`;
  // Terminator: half ellipse with semi-minor axis |2f−1|·R, bulging toward
  // the lit side for a gibbous moon and away from it for a crescent.
  const rx = Math.abs(2 * frac - 1) * R;
  const gibbous = frac > 0.5;
  // Going bottom → top: sweep 1 bulges left, sweep 0 bulges right.
  const bulgeRight = gibbous ? !litRight : litRight;
  const terminator = `A ${rx} ${R} 0 0 ${bulgeRight ? 0 : 1} ${top}`;
  return `${limb} ${terminator} Z`;
}
