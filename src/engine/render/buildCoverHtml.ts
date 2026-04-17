import type {PublishingCoverStrategy, PublishingPack} from './publishingPackTypes';

type BuildCoverHtmlArgs = {
  equation?: string;
  familyLabel?: string;
  publishingPack: PublishingPack;
};

const normalizeText = (value?: string) => value?.replace(/\s+/g, ' ').trim() ?? '';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const MODE_CLASS: Record<PublishingCoverStrategy['mode'], string> = {
  hook_cover: 'mode-hook',
  mistake_cover: 'mode-mistake',
  result_cover: 'mode-result'
};

const MODE_LABEL: Record<PublishingCoverStrategy['mode'], string> = {
  hook_cover: 'hook_cover',
  mistake_cover: 'mistake_cover',
  result_cover: 'result_cover'
};

const buildDataBlock = (args: BuildCoverHtmlArgs) => {
  const strategy = args.publishingPack.coverStrategy;

  return {
    badge: strategy.badge,
    equation: normalizeText(args.equation),
    familyLabel: normalizeText(args.familyLabel),
    formulaText: normalizeText(strategy.formulaText),
    mainTitle: strategy.mainTitle,
    mode: strategy.mode,
    subtitle: normalizeText(strategy.subtitle),
    title: args.publishingPack.title
  };
};

export function buildCoverHtml(args: BuildCoverHtmlArgs) {
  const data = buildDataBlock(args);
  const modeClass = MODE_CLASS[data.mode];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.title || data.mainTitle)}</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      background: #0a0b0f;
      color: #ffffff;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #0a0b0f;
    }

    .math-cover {
      position: relative;
      width: 100vw;
      height: 100vh;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 78px;
      isolation: isolate;
      background:
        linear-gradient(132deg, rgba(255, 46, 64, 0.34), rgba(10, 11, 15, 0) 42%),
        linear-gradient(24deg, rgba(0, 185, 168, 0.26), rgba(10, 11, 15, 0) 48%),
        #0a0b0f;
    }

    .math-cover::before {
      content: "";
      position: absolute;
      inset: 34px;
      border: 3px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      z-index: -1;
    }

    .cover-stack {
      width: min(100%, 880px);
      display: grid;
      gap: 42px;
      align-items: center;
    }

    .badge {
      justify-self: start;
      padding: 14px 24px;
      border-radius: 8px;
      background: #ff2e40;
      color: #ffffff;
      font-size: 42px;
      font-weight: 900;
      line-height: 1;
    }

    .mode-result .badge {
      background: #00b9a8;
      color: #031210;
    }

    .mode-hook .badge {
      background: #ffffff;
      color: #0a0b0f;
    }

    .main-title {
      margin: 0;
      color: #ffffff;
      font-size: 118px;
      font-weight: 950;
      letter-spacing: 0;
      line-height: 1.02;
      text-wrap: balance;
    }

    .formula {
      width: fit-content;
      max-width: 100%;
      padding: 24px 32px;
      border: 4px solid rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      color: #ffffff;
      font-size: 78px;
      font-weight: 900;
      line-height: 1.12;
      overflow-wrap: anywhere;
      background: rgba(255, 255, 255, 0.06);
    }

    .mode-result .formula {
      border-color: #00b9a8;
      color: #80fff4;
      font-size: 96px;
    }

    .subtitle {
      max-width: 760px;
      margin: 0;
      color: rgba(255, 255, 255, 0.74);
      font-size: 46px;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.16;
    }

    .watermark {
      position: absolute;
      left: 78px;
      right: 78px;
      bottom: 62px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      color: rgba(255, 255, 255, 0.42);
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0;
    }
  </style>
</head>
<body>
  <main class="math-cover ${modeClass}" data-cover-mode="${escapeHtml(MODE_LABEL[data.mode])}">
    <section class="cover-stack" aria-label="视频封面">
      <div class="badge">${escapeHtml(data.badge)}</div>
      <h1 class="main-title">${escapeHtml(data.mainTitle)}</h1>
      ${data.formulaText ? `<div class="formula">${escapeHtml(data.formulaText)}</div>` : ''}
      ${data.subtitle ? `<p class="subtitle">${escapeHtml(data.subtitle)}</p>` : ''}
    </section>
    <footer class="watermark">
      <span>${escapeHtml(data.familyLabel || '数学短题')}</span>
      <span>${escapeHtml(data.equation)}</span>
    </footer>
  </main>
</body>
</html>`;
}
