import {useCurrentFrame} from 'remotion';
import {SANS, SERIF} from './fonts';
import {eased} from './motion';
import {fadeInOut} from './timing';

type LowerThirdProps = {name: string; line: string; durationInFrames: number};

/** Capsule name and palette line, bottom-left, rising 12 px as it fades in. */
export const LowerThird: React.FC<LowerThirdProps> = ({name, line, durationInFrames}) => {
  const frame = useCurrentFrame();
  const enter = eased(frame, 0, 10, 0, 1);
  const opacity = Math.min(enter, fadeInOut(frame, durationInFrames, 6));
  const rise = (1 - enter) * 12;

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 140,
        transform: `translateY(${rise}px)`,
        opacity,
        color: '#ffffff',
        textShadow: '0 2px 24px rgba(38, 35, 31, 0.35)',
      }}
    >
      <div style={{fontFamily: SERIF, fontSize: 64, lineHeight: 1.1}}>{name}</div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 26,
          letterSpacing: '0.04em',
          color: 'rgba(255, 255, 255, 0.78)',
          marginTop: 10,
        }}
      >
        {line}
      </div>
    </div>
  );
};
