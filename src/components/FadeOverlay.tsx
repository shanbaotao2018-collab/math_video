import type {CSSProperties, ReactNode} from 'react';

type Props = {
  children?: ReactNode;
  opacity: number;
  style?: CSSProperties;
};

export const FadeOverlay = ({children, opacity, style}: Props) => {
  return (
    <div
      style={{
        position: 'absolute',
        opacity,
        ...style
      }}
    >
      {children}
    </div>
  );
};
