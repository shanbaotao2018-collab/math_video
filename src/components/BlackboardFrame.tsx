import {AbsoluteFill} from 'remotion';
import type {PropsWithChildren, ReactNode} from 'react';

type Props = PropsWithChildren<{
  kicker?: ReactNode;
  showHeader?: boolean;
  title: string;
  subtitle?: ReactNode;
}>;

export const BlackboardFrame = ({children, kicker, showHeader = true, subtitle, title}: Props) => {
  return (
    <AbsoluteFill className="blackboard-root">
      <div className="blackboard-noise" />
      <div className="board-vignette" />
      {showHeader ? (
        <header className="lesson-header">
          {kicker ? <div className="header-kicker">{kicker}</div> : null}
          <h1 className="lesson-title">{title}</h1>
          {subtitle ? <div className="lesson-subtitle">{subtitle}</div> : null}
        </header>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};
