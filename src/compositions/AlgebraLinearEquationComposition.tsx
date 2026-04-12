import {useMemo} from 'react';

import {LinearEquationLessonScene} from '../scenes/LinearEquationLessonScene';
import type {AlgebraLesson} from '../types/algebra';
import {normalizeLessonWithTemplate} from '../utils/templates';

type Props = {
  lesson: AlgebraLesson;
};

export const AlgebraLinearEquationComposition = ({lesson}: Props) => {
  const normalizedLesson = useMemo(() => normalizeLessonWithTemplate(lesson), [lesson]);

  return <LinearEquationLessonScene lesson={normalizedLesson} />;
};
