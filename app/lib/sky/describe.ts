import type {SkyScene} from './scene.ts';

/**
 * Names the Moon's phase from its illuminated fraction. `waxing` is true
 * when the lit side is growing; callers derive it from the scene's
 * `litRight` and the observer's hemisphere.
 */
export function moonPhaseName(fraction: number, waxing: boolean): string {
  if (fraction < 0.03) return 'New moon';
  if (fraction >= 0.97) return 'Full moon';
  if (fraction < 0.4) return waxing ? 'Waxing crescent moon' : 'Waning crescent moon';
  if (fraction <= 0.6) return waxing ? 'First-quarter moon' : 'Last-quarter moon';
  return waxing ? 'Waxing gibbous moon' : 'Waning gibbous moon';
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * One line of astronomy for the preview: the Moon's phase (or that it is
 * below the horizon) and which planets stand above the horizon.
 */
export function describeSkyScene(
  scene: Pick<SkyScene, 'moon' | 'planets'>,
  lat: number,
): string {
  const moon = scene.moon
    ? moonPhaseName(
        scene.moon.phaseFraction,
        lat >= 0 ? scene.moon.litRight : !scene.moon.litRight,
      )
    : 'Moon below the horizon';
  const planets = scene.planets.map((planet) => planet.name);
  const sky =
    planets.length > 0
      ? `${joinNames(planets)} above the horizon`
      : 'no planets in view';
  return `${moon} · ${sky}`;
}
