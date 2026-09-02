import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {PictureLayer} from './Scene';
import {PAPER, type Picture} from './script';

type CutsProps = {pictures: Picture[]; durationInFrames: number};

const CutFrame: React.FC<{picture: Picture; duration: number}> = ({picture, duration}) => {
  const frame = useCurrentFrame();
  return <PictureLayer picture={picture} frame={frame} duration={duration} />;
};

/** Hard cuts between pictures of equal length inside one beat. */
export const Cuts: React.FC<CutsProps> = ({pictures, durationInFrames}) => {
  const each = Math.floor(durationInFrames / pictures.length);

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {pictures.map((picture, index) => {
        const isLast = index === pictures.length - 1;
        const length = isLast ? durationInFrames - index * each : each;
        return (
          <Sequence key={picture.src} from={index * each} durationInFrames={length}>
            <CutFrame picture={picture} duration={length} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
