import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {eased} from './motion';
import {PAPER, type Picture} from './script';

/** Frames the second picture takes to fade in over the first. */
export const CROSSFADE_FRAMES = 12;

type PictureLayerProps = {
  picture: Picture;
  /** Frame relative to the start of this picture's motion. */
  frame: number;
  /** Frames over which the motion runs. */
  duration: number;
  opacity?: number;
};

export const PictureLayer: React.FC<PictureLayerProps> = ({picture, frame, duration, opacity = 1}) => {
  const {motion, focal, src} = picture;
  const scale =
    motion.kind === 'push' ? eased(frame, 0, duration, motion.from, motion.to) : motion.scale;
  const shift = motion.kind === 'drift' ? eased(frame, 0, duration, motion.from, motion.to) : 0;
  const origin = `${focal.x * 100}% ${focal.y * 100}%`;

  return (
    <AbsoluteFill style={{opacity}}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: origin,
          transform: `translateX(${shift}px) scale(${scale})`,
          transformOrigin: origin,
        }}
      />
    </AbsoluteFill>
  );
};

type SceneProps = {
  picture: Picture;
  crossfadeTo?: Picture;
  durationInFrames: number;
};

/**
 * One picture for the whole beat, or a room that crossfades into the print
 * itself: room until `fadeStart`, a 12-frame fade, then the print holds for
 * the last 0.75 s.
 */
export const Scene: React.FC<SceneProps> = ({picture, crossfadeTo, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const holdAfter = Math.round(fps * 0.75);
  const fadeStart = durationInFrames - holdAfter - CROSSFADE_FRAMES;
  const secondOpacity = crossfadeTo
    ? interpolate(frame, [fadeStart, fadeStart + CROSSFADE_FRAMES], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      <PictureLayer picture={picture} frame={frame} duration={durationInFrames} />
      {crossfadeTo ? (
        <PictureLayer
          picture={crossfadeTo}
          frame={Math.max(0, frame - fadeStart)}
          duration={holdAfter + CROSSFADE_FRAMES}
          opacity={secondOpacity}
        />
      ) : null}
    </AbsoluteFill>
  );
};
