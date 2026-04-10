type Props = {
  text: string;
};

export const SubtitleBar = ({text}: Props) => {
  return (
    <div className="subtitle-bar">
      <div className="subtitle-label">当前步骤</div>
      <div className="subtitle-text">{text}</div>
    </div>
  );
};
