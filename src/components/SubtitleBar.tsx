type Props = {
  text: string;
};

export const SubtitleBar = ({text}: Props) => {
  if (!text.trim()) {
    return null;
  }

  return (
    <div className="subtitle-bar">
      <div className="subtitle-label">讲解</div>
      <div className="subtitle-text">{text}</div>
    </div>
  );
};
