import type {CSSProperties} from 'react';

type Point = {
  x: number;
  y: number;
};

type Props = {
  from: Point;
  opacity?: number;
  to: Point;
  progress: number;
  strokeWidth?: number;
  style?: CSSProperties;
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

export const ArrowGuide = ({from, opacity = 0.82, progress, strokeWidth = 4, style, to}: Props) => {
  const safeProgress = clamp(progress);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const dashOffset = length * (1 - safeProgress);
  const angle = Math.atan2(dy, dx);
  const headLength = 12 + strokeWidth;
  const headWidth = 3 + strokeWidth;
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
        stroke={`rgba(255, 233, 156, ${opacity})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={dashOffset}
      />
      {safeProgress > 0.98 ? (
        <polygon
          points={`${drawnTip.x},${drawnTip.y} ${leftPoint.x},${leftPoint.y} ${rightPoint.x},${rightPoint.y}`}
          fill={`rgba(255, 233, 156, ${Math.min(0.92, opacity + 0.08)})`}
        />
      ) : null}
    </svg>
  );
};
