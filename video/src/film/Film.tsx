import {useEffect, useState} from 'react';
import {AbsoluteFill, Sequence, cancelRender, continueRender, delayRender} from 'remotion';
import {Caption} from './Caption';
import {Cuts} from './Cuts';
import {EndCard} from './EndCard';
import {loadFilmFonts} from './fonts';
import {LowerThird} from './LowerThird';
import {Noise} from './Noise';
import {Scene} from './Scene';
import {BEATS, PAPER, beatFrames, beatStarts, type Beat} from './script';
import {Trio} from './Trio';

const BeatView: React.FC<{beat: Beat; durationInFrames: number}> = ({beat, durationInFrames}) => {
  switch (beat.kind) {
    case 'scene':
      return (
        <>
          <Scene
            picture={beat.picture}
            crossfadeTo={beat.crossfadeTo}
            durationInFrames={durationInFrames}
          />
          {beat.caption ? <Caption text={beat.caption} durationInFrames={durationInFrames} /> : null}
          {beat.lowerThird ? (
            <LowerThird {...beat.lowerThird} durationInFrames={durationInFrames} />
          ) : null}
        </>
      );
    case 'cuts':
      return (
        <>
          <Cuts pictures={beat.pictures} durationInFrames={durationInFrames} />
          <Caption text={beat.caption} durationInFrames={durationInFrames} />
        </>
      );
    case 'trio':
      return (
        <>
          <Trio prints={beat.prints} durationInFrames={durationInFrames} />
          <Caption text={beat.caption} durationInFrames={durationInFrames} />
        </>
      );
    case 'end':
      return (
        <EndCard
          background={beat.background}
          wordmark={beat.wordmark}
          url={beat.url}
          durationInFrames={durationInFrames}
        />
      );
  }
};

/** Introducing Clara Mendes — thirteen beats, hard cuts between them. */
export const Film: React.FC = () => {
  const [handle] = useState(() => delayRender('Loading EB Garamond'));
  useEffect(() => {
    loadFilmFonts()
      .then(() => continueRender(handle))
      .catch((error: unknown) => cancelRender(error));
  }, [handle]);

  const starts = beatStarts(BEATS);

  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {BEATS.map((beat, index) => (
        <Sequence
          key={beat.id}
          name={beat.id}
          from={starts[index]}
          durationInFrames={beatFrames(beat)}
        >
          <BeatView beat={beat} durationInFrames={beatFrames(beat)} />
        </Sequence>
      ))}
      <Noise />
    </AbsoluteFill>
  );
};
