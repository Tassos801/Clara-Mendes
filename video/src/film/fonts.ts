import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const SERIF = 'EB Garamond';
export const SANS =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

let loading: Promise<void> | null = null;

/** Loads the storefront's own EB Garamond files once per render process. */
export const loadFilmFonts = (): Promise<void> => {
  loading ??= Promise.all([
    loadFont({
      family: SERIF,
      url: staticFile('fonts/EBGaramond-Regular.ttf'),
      weight: '400',
      style: 'normal',
    }),
    loadFont({
      family: SERIF,
      url: staticFile('fonts/EBGaramond-Italic.ttf'),
      weight: '400',
      style: 'italic',
    }),
  ]).then(() => undefined);
  return loading;
};
