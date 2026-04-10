import {LinearEquationLessonScene} from '../scenes/LinearEquationLessonScene';
import type {AlgebraLesson} from '../types/algebra';

type Props = {
  lesson: AlgebraLesson;
};

export const AlgebraLinearEquationComposition = ({lesson}: Props) => {
  return <LinearEquationLessonScene lesson={lesson} />;
};
