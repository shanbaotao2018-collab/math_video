const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const COMPILED_CAPABILITIES_PATH = '/tmp/math-video-delivery/engine/integration/algebraCapabilityCatalog.js';
const COMPILED_EXAMPLES_PATH = '/tmp/math-video-delivery/engine/integration/algebraContentPack.js';
const COMPILED_ENTRY_PATH = '/tmp/math-video-delivery/engine/integration/buildAlgebraProductEntry.js';
const DEFAULT_PORT = 4173;
const PREVIEW_FILE = path.resolve(process.cwd(), 'out/algebra-linear-equation-mvp.mp4');
const PREVIEW_PATHNAME = '/preview/algebra-linear-equation-mvp.mp4';
const PRESENTATION_MODES = new Set(['auto', 'answer_only', 'compact_steps', 'full_steps', 'semantic_full_steps']);

const loadBuildAlgebraProductEntry = () => {
  const loaded = require(COMPILED_ENTRY_PATH);
  const buildAlgebraProductEntry = loaded.buildAlgebraProductEntry ?? loaded.default?.buildAlgebraProductEntry;

  if (typeof buildAlgebraProductEntry !== 'function') {
    throw new Error(`Cannot load buildAlgebraProductEntry from ${COMPILED_ENTRY_PATH}`);
  }

  return buildAlgebraProductEntry;
};

const loadAlgebraCapabilityCatalog = () => {
  const loaded = require(COMPILED_CAPABILITIES_PATH);
  const getAlgebraCapabilityCatalog =
    loaded.getAlgebraCapabilityCatalog ?? loaded.default?.getAlgebraCapabilityCatalog;

  if (typeof getAlgebraCapabilityCatalog !== 'function') {
    throw new Error(`Cannot load getAlgebraCapabilityCatalog from ${COMPILED_CAPABILITIES_PATH}`);
  }

  return getAlgebraCapabilityCatalog();
};

const loadAlgebraContentPack = () => {
  const loaded = require(COMPILED_EXAMPLES_PATH);
  const getAlgebraOfficialContentPack =
    loaded.getAlgebraOfficialContentPack ?? loaded.default?.getAlgebraOfficialContentPack;

  if (typeof getAlgebraOfficialContentPack !== 'function') {
    throw new Error(`Cannot load getAlgebraOfficialContentPack from ${COMPILED_EXAMPLES_PATH}`);
  }

  return getAlgebraOfficialContentPack();
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
};

const sendHtml = (response, html) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  response.end(html);
};

const sendText = (response, statusCode, text) => {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  response.end(text);
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large.'));
      }
    });

    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderDemoPage = (contentPack) => {
  const hasPreview = fs.existsSync(PREVIEW_FILE);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Algebra Delivery Demo</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0b1612;
        color: #eff7f1;
      }
      .app {
        width: min(1180px, calc(100vw - 32px));
        margin: 24px auto 48px;
        display: grid;
        gap: 18px;
      }
      .panel {
        border: 1px solid rgba(205, 233, 213, 0.14);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        padding: 18px 20px;
      }
      .title {
        margin: 0;
        font-size: 30px;
        line-height: 1.1;
      }
      .subtitle {
        margin-top: 8px;
        color: rgba(239, 247, 241, 0.72);
        font-size: 15px;
      }
      .form-grid {
        display: grid;
        gap: 12px;
      }
      textarea {
        width: 100%;
        min-height: 96px;
        padding: 12px 14px;
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.18);
        background: #10201a;
        color: #f5fbf6;
        font: inherit;
        resize: vertical;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 14px;
      }
      .checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: rgba(239, 247, 241, 0.82);
        font-size: 14px;
      }
      label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      button {
        border: 0;
        border-radius: 6px;
        background: #9be7ba;
        color: #0a1812;
        padding: 10px 16px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .meta-card {
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.14);
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.02);
      }
      .meta-label {
        font-size: 12px;
        color: rgba(239, 247, 241, 0.58);
        text-transform: uppercase;
      }
      .meta-value {
        margin-top: 6px;
        font-size: 16px;
        line-height: 1.35;
        word-break: break-word;
      }
      .answer {
        font-size: 28px;
        color: #fff1bd;
        line-height: 1.35;
        word-break: break-word;
      }
      .steps {
        display: grid;
        gap: 10px;
      }
      .step {
        padding: 12px 14px;
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.12);
        background: rgba(255, 255, 255, 0.02);
      }
      .step-head {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 8px;
      }
      .badge {
        display: inline-flex;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        background: rgba(155, 231, 186, 0.16);
        color: #c9f8d8;
      }
      .step-latex {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 15px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .step-note {
        margin-top: 8px;
        color: rgba(239, 247, 241, 0.78);
        line-height: 1.5;
      }
      .json {
        margin: 0;
        padding: 14px;
        overflow: auto;
        border-radius: 8px;
        background: #0a1410;
        border: 1px solid rgba(205, 233, 213, 0.12);
        font-size: 12px;
        line-height: 1.55;
      }
      .hidden { display: none; }
      .preview video {
        width: 100%;
        max-width: 900px;
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.14);
        background: #000;
      }
      .capabilities {
        display: grid;
        gap: 12px;
      }
      .examples-panel {
        display: grid;
        gap: 12px;
      }
      .example-section {
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.12);
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.02);
      }
      .example-title {
        font-weight: 700;
        margin-bottom: 6px;
      }
      .example-grid {
        display: grid;
        gap: 8px;
        margin-top: 10px;
      }
      .example-button {
        width: 100%;
        text-align: left;
        display: grid;
        gap: 4px;
        background: #11231b;
        color: #eef8f1;
        border: 1px solid rgba(205, 233, 213, 0.14);
      }
      .example-button:hover {
        background: #173127;
      }
      .example-label {
        font-size: 14px;
        font-weight: 600;
      }
      .example-equation {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
        color: rgba(239, 247, 241, 0.86);
        word-break: break-word;
      }
      .example-meta {
        font-size: 12px;
        color: rgba(239, 247, 241, 0.64);
      }
      .capability-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .capability-summary-card {
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.12);
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.02);
      }
      .capability-family {
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.12);
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.02);
      }
      .capability-title {
        font-weight: 700;
        margin-bottom: 8px;
      }
      .capability-detail {
        color: rgba(239, 247, 241, 0.78);
        font-size: 13px;
        line-height: 1.55;
      }
      .capability-list {
        margin-top: 10px;
        display: grid;
        gap: 8px;
      }
      .capability-item {
        border-radius: 8px;
        border: 1px solid rgba(205, 233, 213, 0.1);
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.12);
      }
      .capability-item-title {
        font-size: 13px;
        font-weight: 600;
        color: #dff6e6;
      }
      .capability-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      @media (max-width: 860px) {
        .meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .capability-summary { grid-template-columns: 1fr; }
      }
      @media (max-width: 520px) {
        .meta { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="app">
      <section class="panel">
        <h1 class="title">Algebra Delivery Demo</h1>
        <div class="subtitle">输入题目，直接走统一产品入口，查看 family、supported、quality、steps 和最终 answer。</div>
      </section>

      <section class="panel">
        <div class="form-grid">
          <textarea id="equation-input">x+y=5, x-y=1</textarea>
          <div class="controls">
            <button id="solve-button" type="button">Solve</button>
            <div class="checkboxes">
              <label><input id="ai-input" type="checkbox" /> ai</label>
              <label><input id="lesson-input" type="checkbox" checked /> includeLesson</label>
              <label><input id="report-input" type="checkbox" checked /> returnReport</label>
              <label><input id="fallback-input" type="checkbox" checked /> fallbackOnUnsupported</label>
              <label>
                presentationMode
                <select id="presentation-mode-input">
                  <option value="auto">auto</option>
                  <option value="answer_only">answer_only</option>
                  <option value="compact_steps">compact_steps</option>
                  <option value="full_steps">full_steps</option>
                  <option value="semantic_full_steps">semantic_full_steps</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="meta-label">Examples</div>
        <div class="subtitle">官方 content pack，覆盖 featured、teaching、edge 和 unsupported。API: GET /examples</div>
        <div class="examples-panel" id="examples-container"></div>
      </section>

      <section class="panel">
        <div class="meta" id="meta-grid">
          <div class="meta-card"><div class="meta-label">Family</div><div class="meta-value" id="family-value">-</div></div>
          <div class="meta-card"><div class="meta-label">Supported</div><div class="meta-value" id="supported-value">-</div></div>
          <div class="meta-card"><div class="meta-label">Quality</div><div class="meta-value" id="quality-value">-</div></div>
          <div class="meta-card"><div class="meta-label">Render</div><div class="meta-value" id="render-value">-</div></div>
        </div>
      </section>

      <section class="panel">
        <div class="meta-label">Answer</div>
        <div class="answer" id="answer-value">-</div>
      </section>

      <section class="panel">
        <div class="meta-label">Steps</div>
        <div class="steps" id="steps-container"></div>
      </section>

      <section class="panel">
        <div class="meta-label">Capabilities</div>
        <div class="subtitle">当前引擎支持范围、推荐展示模式和边界样例。API: GET /capabilities</div>
        <div class="capability-summary" id="capability-summary"></div>
        <div class="capabilities" id="capabilities-container"></div>
      </section>

      <section class="panel preview ${hasPreview ? '' : 'hidden'}" id="preview-panel">
        <div class="meta-label">Render Preview</div>
        <div class="subtitle">当前工程已有渲染输出时，这里直接播放现成视频。</div>
        <video controls preload="metadata" src="${PREVIEW_PATHNAME}"></video>
      </section>

      <section class="panel">
        <div class="meta-label">Raw JSON</div>
        <pre class="json" id="json-output">-</pre>
      </section>
    </div>

    <script>
      const equationInput = document.getElementById('equation-input');
      const aiInput = document.getElementById('ai-input');
      const lessonInput = document.getElementById('lesson-input');
      const reportInput = document.getElementById('report-input');
      const fallbackInput = document.getElementById('fallback-input');
      const presentationModeInput = document.getElementById('presentation-mode-input');
      const solveButton = document.getElementById('solve-button');
      const examplesContainer = document.getElementById('examples-container');
      const familyValue = document.getElementById('family-value');
      const supportedValue = document.getElementById('supported-value');
      const qualityValue = document.getElementById('quality-value');
      const renderValue = document.getElementById('render-value');
      const answerValue = document.getElementById('answer-value');
      const stepsContainer = document.getElementById('steps-container');
      const capabilitySummary = document.getElementById('capability-summary');
      const capabilitiesContainer = document.getElementById('capabilities-container');
      const jsonOutput = document.getElementById('json-output');
      const contentPack = ${JSON.stringify(contentPack)};

      const escapeHtml = ${escapeHtml.toString()};

      const renderSteps = (steps) => {
        if (!steps || steps.length === 0) {
          stepsContainer.innerHTML = '<div class="step"><div class="step-note">No steps.</div></div>';
          return;
        }

        stepsContainer.innerHTML = steps.map((step, index) => \`
          <div class="step">
            <div class="step-head">
              <span class="badge">#\${index + 1}</span>
              <span class="badge">\${escapeHtml(step.kind ?? step.legacyKind ?? '-')}</span>
              <span class="badge">\${escapeHtml(step.operation?.type ?? '-')}</span>
            </div>
            <div class="step-latex">\${escapeHtml(step.latex ?? step.expression ?? '')}</div>
            \${step.note ? \`<div class="step-note">\${escapeHtml(step.note)}</div>\` : ''}
          </div>
        \`).join('');
      };

      const updateView = (result) => {
        familyValue.textContent = result.family ? \`\${result.family.label} (\${result.family.id})\` : '-';
        supportedValue.textContent = String(result.supported);
        qualityValue.textContent = result.qualityLabel ?? result.quality ?? '-';
        renderValue.textContent = result.render ? \`\${result.render.scene} / renderable=\${result.render.renderable}\` : '-';
        answerValue.textContent = result.problem?.answer ?? '-';
        renderSteps(result.problem?.steps ?? []);
        jsonOutput.textContent = JSON.stringify(result, null, 2);
      };

      const renderExamples = (pack) => {
        const categories = pack?.categories ?? [];

        if (categories.length === 0) {
          examplesContainer.innerHTML = '<div class="example-section"><div class="capability-detail">No examples.</div></div>';
          return;
        }

        examplesContainer.innerHTML = categories.map((category) => {
          const buttons = (category.examples ?? []).map((example) => {
            const tags = (example.tags ?? []).join(', ');

            return \`
              <button class="example-button" type="button"
                data-equation="\${escapeHtml(example.equation)}"
                data-mode="\${escapeHtml(example.recommendedPresentationMode ?? 'auto')}">
                <span class="example-label">\${escapeHtml(example.label)}</span>
                <span class="example-equation">\${escapeHtml(example.equation)}</span>
                <span class="example-meta">\${escapeHtml(example.family)} / \${escapeHtml(example.difficulty ?? 'unrated')} / \${escapeHtml(tags || 'untagged')}</span>
              </button>
            \`;
          }).join('');

          return \`
            <div class="example-section">
              <div class="example-title">\${escapeHtml(category.label)} (\${escapeHtml(category.id)})</div>
              <div class="capability-detail">\${escapeHtml(category.summary ?? '')}</div>
              <div class="example-grid">\${buttons}</div>
            </div>
          \`;
        }).join('');

        examplesContainer.querySelectorAll('.example-button').forEach((button) => {
          button.addEventListener('click', () => {
            equationInput.value = button.dataset.equation ?? '';
            presentationModeInput.value = button.dataset.mode ?? 'auto';
            void solve();
          });
        });
      };

      const renderCapabilities = (catalog) => {
        const families = catalog?.families ?? [];
        const boundaries = catalog?.boundaries;
        const versions = catalog?.versions;
        const latestChange = catalog?.changeSummary?.latest;
        const presentationModes = (catalog?.presentationModes ?? [])
          .map((mode) => \`<div class="capability-detail">\${escapeHtml(mode.id)}: \${escapeHtml(mode.label)}</div>\`)
          .join('');
        const qualityTiers = (catalog?.qualityTiers ?? [])
          .map((tier) => \`<div class="capability-detail">\${escapeHtml(tier.id)}: \${escapeHtml(tier.label)}</div>\`)
          .join('');

        capabilitySummary.innerHTML = \`
          <div class="capability-summary-card">
            <div class="meta-label">Versions</div>
            <div class="capability-detail">engine: \${escapeHtml(versions?.engineVersion ?? '-')}</div>
            <div class="capability-detail">productEntry: \${escapeHtml(versions?.productEntrySchemaVersion ?? '-')}</div>
            <div class="capability-detail">catalog: \${escapeHtml(catalog?.schemaVersion ?? versions?.capabilityCatalogSchemaVersion ?? '-')}</div>
          </div>
          <div class="capability-summary-card">
            <div class="meta-label">Fallback Policy</div>
            <div class="capability-detail">\${escapeHtml(boundaries?.fallback?.when ?? '-')}</div>
            <div class="capability-detail">\${escapeHtml(boundaries?.fallback?.behavior ?? '-')}</div>
            <div class="capability-detail" style="margin-top:8px;">\${escapeHtml(boundaries?.unsupported?.when ?? '-')}</div>
            <div class="capability-detail">\${escapeHtml(boundaries?.unsupported?.behavior ?? '-')}</div>
          </div>
          <div class="capability-summary-card">
            <div class="meta-label">Latest Change</div>
            <div class="capability-detail">\${escapeHtml(latestChange?.title ?? '-')}</div>
            <div class="capability-detail">\${escapeHtml(latestChange?.date ?? '-')} / impact=\${escapeHtml(latestChange?.contractImpact ?? '-')}</div>
            <div class="capability-detail">\${escapeHtml(latestChange?.summary ?? '-')}</div>
          </div>
          <div class="capability-summary-card">
            <div class="meta-label">Modes / Tiers</div>
            \${presentationModes || '<div class="capability-detail">-</div>'}
            <div style="height:8px;"></div>
            \${qualityTiers || '<div class="capability-detail">-</div>'}
          </div>
        \`;

        if (families.length === 0) {
          capabilitiesContainer.innerHTML = '<div class="capability-family"><div class="capability-detail">No capability catalog.</div></div>';
          return;
        }

        capabilitiesContainer.innerHTML = families.map((family) => {
          const boundaries = family.boundaries
            .map((boundary) => \`
              <div class="capability-item">
                <div class="capability-item-title">\${escapeHtml(boundary.behavior)}: \${escapeHtml(boundary.example)}</div>
                <div class="capability-detail">\${escapeHtml(boundary.reason)}</div>
              </div>
            \`)
            .join('');
          const shapes = family.supportedShapes
            .map((shape) => \`
              <div class="capability-item">
                <div class="capability-item-title">\${escapeHtml(shape.label)} (\${escapeHtml(shape.id)})</div>
                <div class="capability-detail">\${escapeHtml((shape.examples ?? []).join(' / '))}</div>
                \${shape.notes ? \`<div class="capability-detail">\${escapeHtml(shape.notes)}</div>\` : ''}
              </div>
            \`)
            .join('');
          const resultExamples = (family.currentResult?.examples ?? []).join(' / ');

          return \`
            <div class="capability-family">
              <div class="capability-title">\${escapeHtml(family.label)} (\${escapeHtml(family.family)})</div>
              <div class="capability-chip-row">
                <span class="badge">tier: \${escapeHtml(family.recommendation?.qualityTier ?? family.recommendedQualityTier)}</span>
                <span class="badge">mode: \${escapeHtml(family.recommendation?.presentationMode ?? family.recommendedPresentationMode)}</span>
                <span class="badge">result: \${escapeHtml(family.currentResult?.kind ?? '-')}</span>
              </div>
              <div class="capability-detail" style="margin-top:10px;">推荐原因：\${escapeHtml(family.recommendation?.why ?? '-')}</div>
              <div class="capability-detail">当前结果形态：\${escapeHtml(family.currentResult?.format ?? family.resultShape ?? '-')}</div>
              <div class="capability-detail">结果示例：\${escapeHtml(resultExamples || '-')}</div>
              <div class="capability-list">\${shapes}</div>
              <div class="capability-detail" style="margin-top:10px;">Boundary examples</div>
              <div class="capability-list">\${boundaries || '<div class="capability-item"><div class="capability-detail">None</div></div>'}</div>
            </div>
          \`;
        }).join('');
      };

      const loadCapabilities = async () => {
        try {
          const response = await fetch('/capabilities');
          const catalog = await response.json();
          renderCapabilities(catalog);
        } catch (error) {
          capabilitiesContainer.innerHTML = \`<div class="capability-family"><div class="capability-detail">\${escapeHtml(String(error))}</div></div>\`;
        }
      };

      const solve = async () => {
        solveButton.disabled = true;
        solveButton.textContent = 'Solving...';

        try {
          const response = await fetch('/solve', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              equation: equationInput.value,
              ai: aiInput.checked,
              includeLesson: lessonInput.checked,
              presentationMode: presentationModeInput.value,
              returnReport: reportInput.checked,
              noFallback: !fallbackInput.checked
            })
          });

          const result = await response.json();
          updateView(result);
        } catch (error) {
          jsonOutput.textContent = String(error);
        } finally {
          solveButton.disabled = false;
          solveButton.textContent = 'Solve';
        }
      };

      solveButton.addEventListener('click', solve);
      renderExamples(contentPack);
      void loadCapabilities();
      void solve();
    </script>
  </body>
</html>`;
};

const createServer = (buildAlgebraProductEntry, capabilityCatalog, contentPack) =>
  http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Origin': '*'
      });
      response.end();
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/') {
      sendHtml(response, renderDemoPage(contentPack));
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/health') {
      sendJson(response, 200, {
        changeSummary: {
          currentReleaseId: capabilityCatalog?.changeSummary?.currentReleaseId ?? null,
          latest: capabilityCatalog?.changeSummary?.latest ?? null,
          strategy: capabilityCatalog?.changeSummary?.strategy ?? null
        },
        ok: true,
        versions: capabilityCatalog?.versions ?? null
      });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/capabilities') {
      sendJson(response, 200, capabilityCatalog);
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/examples') {
      sendJson(response, 200, contentPack);
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === PREVIEW_PATHNAME) {
      if (!fs.existsSync(PREVIEW_FILE)) {
        sendText(response, 404, 'Preview not found.');
        return;
      }

      response.writeHead(200, {
        'Content-Type': 'video/mp4'
      });
      fs.createReadStream(PREVIEW_FILE).pipe(response);
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/solve') {
      try {
        const body = await readJsonBody(request);
        const equation = typeof body.equation === 'string' ? body.equation : '';
        const presentationMode = PRESENTATION_MODES.has(body.presentationMode) ? body.presentationMode : 'auto';

        if (!equation.trim()) {
          sendJson(response, 400, {
            error: 'equation is required'
          });
          return;
        }

        const result = await buildAlgebraProductEntry(equation, {
          ai: Boolean(body.ai),
          fallbackOnUnsupported: body.noFallback ? false : true,
          includeLesson: body.includeLesson !== false,
          presentationMode,
          returnReport: body.returnReport !== false
        });

        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : 'Unknown server error'
        });
      }
      return;
    }

    sendText(response, 404, 'Not found.');
  });

const startServer = (server, port) => {
  server.listen(port, '127.0.0.1');

  server.on('listening', () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    console.log(`[delivery] Web demo: http://127.0.0.1:${actualPort}`);
    console.log(`[delivery] API: POST http://127.0.0.1:${actualPort}/solve`);
    console.log(`[delivery] Capabilities: GET http://127.0.0.1:${actualPort}/capabilities`);
    console.log(`[delivery] Examples: GET http://127.0.0.1:${actualPort}/examples`);
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      startServer(server, port + 1);
      return;
    }

    console.error(error);
    process.exitCode = 1;
  });
};

const main = () => {
  const buildAlgebraProductEntry = loadBuildAlgebraProductEntry();
  const capabilityCatalog = loadAlgebraCapabilityCatalog();
  const contentPack = loadAlgebraContentPack();
  const server = createServer(buildAlgebraProductEntry, capabilityCatalog, contentPack);
  startServer(server, DEFAULT_PORT);
};

main();
