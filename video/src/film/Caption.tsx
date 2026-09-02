import {useCurrentFrame} from 'remotion';
import {SERIF} from './fonts';
import {fadeInOut} from './timing';

export const CAPTION_FADE = 6;

type CaptionProps = {text: string; durationInFrames: number};

/** The presenter's line: EB Garamond on the site's dark glass, bottom centre. */
export const Caption: React.FC<CaptionProps> = ({text, durationInFrames}) => {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, durationInFrames, CAPTION_FADE);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 96,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 56,
          lineHeight: 1.25,
          color: '#ffffff',
          textAlign: 'center',
          maxWidth: 1240,
          padding: '14px 28px',
          borderRadius: 4,
          background: 'rgba(30, 28, 24, 0.48)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
