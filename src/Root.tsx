import 'katex/dist/katex.min.css';
import './styles/global.css';

import {Composition} from 'remotion';

import {AlgebraLinearEquationComposition} from './compositions/AlgebraLinearEquationComposition';
import {linearEquationLesson} from './data/linearEquationLesson';
import {calculateLessonDuration} from './utils/timing';

export const RemotionRoot = () => {
  return (
    <Composition
      id="AlgebraLinearEquationMvp"
      component={AlgebraLinearEquationComposition}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={calculateLessonDuration(linearEquationLesson)}
      defaultProps={{lesson: linearEquationLesson}}
    />
  );
};
