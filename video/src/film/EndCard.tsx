import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SANS, SERIF} from './fonts';
import {eased} from './motion';
import {PictureLayer} from './Scene';
import {INK, type Picture} from './script';

type EndCardProps = {
  background: Picture;
  wordmark: string;
  url: string;
  durationInFrames: number;
};

/** Backdrop under a 20 % ink wash; italic wordmark and URL fade up. */
export const EndCard: React.FC<EndCardProps> = ({background, wordmark, url, durationInFrames}) => {
  const frame = useCurrentFrame();
  const wordmarkOpacity = eased(frame, 6, 24, 0, 1);
  const urlOpacity = eased(frame, 14, 32, 0, 1);

  return (
    <AbsoluteFill style={{backgroundColor: INK}}>
      <PictureLayer picture={background} frame={frame} duration={durationInFrames} />
      <AbsoluteFill style={{backgroundColor: 'rgba(38, 35, 31, 0.2)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: '#ffffff'}}>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 120,
            letterSpacing: '0.02em',
            lineHeight: 1,
            opacity: wordmarkOpacity,
          }}
        >
          {wordmark}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 28,
            letterSpacing: '0.12em',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: 28,
            opacity: urlOpacity,
          }}
        >
          {url}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
