import type {CSSProperties} from 'react';

type Point = {
  x: number;
  y: number;
};

type Props = {
  from: Point;
  to: Point;
  progress: number;
  style?: CSSProperties;
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

export const ArrowGuide = ({from, progress, style, to}: Props) => {
  const safeProgress = clamp(progress);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const dashOffset = length * (1 - safeProgress);
  const angle = Math.atan2(dy, dx);
  const headLength = 18;
  const headWidth = 8;
  const drawnTip = {
    x: from.x + dx * safeProgress,
    y: from.y + dy * safeProgress
  };
  const leftPoint = {
    x: drawnTip.x - headLength * Math.cos(angle) + headWidth * Math.sin(angle),
    y: drawnTip.y - headLength * Math.sin(angle) - headWidth * Math.cos(angle)
  };
  const rightPoint = {
    x: drawnTip.x - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
    y: drawnTip.y - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
  };

  return (
    <svg
      viewBox="0 0 1920 1080"
      style={{
        inset: 0,
        overflow: 'visible',
        position: 'absolute',
        width: '100%',
        height: '100%',
        ...style
      }}
    >
      <path
        d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
        fill="none"
        stroke="rgba(255, 233, 156, 0.95)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={dashOffset}
      />
      {safeProgress > 0.98 ? (
        <polygon
          points={`${drawnTip.x},${drawnTip.y} ${leftPoint.x},${leftPoint.y} ${rightPoint.x},${rightPoint.y}`}
          fill="rgba(255, 233, 156, 0.98)"
        />
      ) : null}
    </svg>
  );
};
