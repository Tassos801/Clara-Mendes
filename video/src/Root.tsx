import {Composition} from 'remotion';
import {Film} from './film/Film';
import {BEATS, FPS, HEIGHT, WIDTH, totalFrames} from './film/script';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="IntroducingClaraMendes"
      component={Film}
      durationInFrames={totalFrames(BEATS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
