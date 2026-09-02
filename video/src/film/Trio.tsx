import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {eased} from './motion';
import {PAPER} from './script';

type TrioProps = {prints: string[]; durationInFrames: number};

/** Three prints settle onto paper one after another, 8 frames apart. */
export const Trio: React.FC<TrioProps> = ({prints}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PAPER,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 64,
        paddingBottom: 120,
      }}
    >
      {prints.map((src, index) => {
        const start = index * 8;
        const settle = eased(frame, start, start + 18, 0, 1);
        return (
          <Img
            key={src}
            src={staticFile(src)}
            style={{
              width: 496,
              height: 620,
              objectFit: 'cover',
              opacity: settle,
              transform: `translateY(${(1 - settle) * 24}px)`,
              boxShadow: '0 30px 60px -30px rgba(38, 35, 31, 0.35)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
