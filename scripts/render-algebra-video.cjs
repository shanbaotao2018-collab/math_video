#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const {
  ensureMixedAudioTrack,
  finalizeVideoAudio
} = require('./audio-finalization.cjs');

const COMPILED_ROOT = '/tmp/math-video-video';
const COMPILED_ENTRY_PATH = path.join(COMPILED_ROOT, 'engine/integration/buildAlgebraProductEntry.js');
const COMPILED_COVER_HTML_PATH = path.join(COMPILED_ROOT, 'engine/render/buildCoverHtml.js');
const COMPILED_RENDER_PLAN_PATH = path.join(COMPILED_ROOT, 'engine/render/buildVideoRenderPlan.js');
const COMPILED_VIDEO_HTML_PATH = path.join(COMPILED_ROOT, 'engine/render/buildVideoHtml.js');
const COMPILED_SUBTITLE_CUE_PATH = path.join(COMPILED_ROOT, 'engine/render/buildSubtitleCuePlan.js');
const COMPILED_VOICE_CUE_PATH = path.join(COMPILED_ROOT, 'engine/render/buildVoiceCuePlan.js');
const COMPILED_TTS_PATH = path.join(COMPILED_ROOT, 'engine/tts/synthesizeVoiceCuePlan.js');

const DEFAULT_VIEWPORT = {
  fps: 30,
  height: 1920,
  width: 1080
};

const loadModuleExport = (modulePath, exportName) => {
  const loaded = require(modulePath);
  const resolved = loaded?.[exportName] ?? loaded?.default?.[exportName];

  if (typeof resolved !== 'function') {
    throw new Error(`Cannot load ${exportName} from ${modulePath}`);
  }

  return resolved;
};

const buildAlgebraProductEntry = loadModuleExport(COMPILED_ENTRY_PATH, 'buildAlgebraProductEntry');
const buildCoverHtml = loadModuleExport(COMPILED_COVER_HTML_PATH, 'buildCoverHtml');
const buildVideoRenderPlan = loadModuleExport(COMPILED_RENDER_PLAN_PATH, 'buildVideoRenderPlan');
const buildVideoHtml = loadModuleExport(COMPILED_VIDEO_HTML_PATH, 'buildVideoHtml');
const serializeSubtitleCuePlanToSrt = loadModuleExport(COMPILED_SUBTITLE_CUE_PATH, 'serializeSubtitleCuePlanToSrt');
const serializeVoiceCuePauseDebug = loadModuleExport(COMPILED_VOICE_CUE_PATH, 'serializeVoiceCuePauseDebug');
const serializeVoiceCuePlanToSpeakableText = loadModuleExport(COMPILED_VOICE_CUE_PATH, 'serializeVoiceCuePlanToSpeakableText');
const serializeVoiceCuePlanToSrt = loadModuleExport(COMPILED_VOICE_CUE_PATH, 'serializeVoiceCuePlanToSrt');
const serializeVoiceCuePlanToText = loadModuleExport(COMPILED_VOICE_CUE_PATH, 'serializeVoiceCuePlanToText');
const synthesizeVoiceCuePlan = loadModuleExport(COMPILED_TTS_PATH, 'synthesizeVoiceCuePlan');

const parseArgs = (argv) => {
  const args = {
    equation: '',
    hookStyle: undefined,
    htmlOnly: false,
    teachingPersona: undefined,
    tts: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--html-only') {
      args.htmlOnly = true;
      continue;
    }

    if (value === '--hook-style' || value === '--hookStyle') {
      args.hookStyle = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--persona' || value === '--teaching-persona' || value === '--teachingPersona') {
      args.teachingPersona = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--tts') {
      const provider = argv[index + 1];

      if (provider === 'mock' || provider === 'real') {
        args.tts = provider;
      }

      index += 1;
      continue;
    }

    if (!args.equation) {
      args.equation = value;
    }
  }

  return args;
};

const slugify = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'video';
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, {recursive: true});
};

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const resolveChromePath = () => {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const runCommand = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    ...options
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error([`Command failed: ${command} ${args.join(' ')}`, stderr, stdout].filter(Boolean).join('\n'));
  }

  return result;
};

const renderScreenshot = ({
  chromePath,
  outputPath,
  url,
  viewport
}) => {
  runCommand(chromePath, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    '--virtual-time-budget=1000',
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${outputPath}`,
    url
  ]);
};

const renderKeyframes = ({
  chromePath,
  frameDir,
  htmlUrl,
  renderPlan,
  viewport
}) => {
  const concatFilePath = path.join(frameDir, 'frames.txt');
  const concatLines = [];

  renderPlan.shots.forEach((shot, index) => {
    const shotDurationMs = Math.max(1, shot.endMs - shot.startMs);
    const timeMs = Math.min(shot.endMs - 1, shot.startMs + Math.floor(shotDurationMs / 2));
    const frameName = `frame-${String(index + 1).padStart(5, '0')}.png`;
    const framePath = path.join(frameDir, frameName);
    const urlWithTime = `${htmlUrl}?t=${timeMs}`;

    renderScreenshot({
      chromePath,
      outputPath: framePath,
      url: urlWithTime,
      viewport
    });

    concatLines.push(`file '${framePath.replace(/'/g, "'\\''")}'`);
    concatLines.push(`duration ${(shotDurationMs / 1000).toFixed(3)}`);
  });

  const lastFramePath = path.join(frameDir, `frame-${String(renderPlan.shots.length).padStart(5, '0')}.png`);

  if (renderPlan.shots.length > 0) {
    concatLines.push(`file '${lastFramePath.replace(/'/g, "'\\''")}'`);
  }

  fs.writeFileSync(concatFilePath, concatLines.join('\n') + '\n');

  return {
    concatFilePath,
    frameCount: renderPlan.shots.length
  };
};

const renderMp4FromFrames = ({concatFilePath, fps, outputPath}) => {
  runCommand('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatFilePath,
    '-vf',
    `fps=${fps},format=yuv420p`,
    '-c:v',
    'libx264',
    '-movflags',
    '+faststart',
    outputPath
  ]);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.equation) {
    console.error('Usage: node scripts/render-algebra-video.cjs "<equation>" [--html-only]');
    process.exitCode = 1;
    return;
  }

  const productEntry = await buildAlgebraProductEntry(args.equation, {
    ai: false,
    hookStyle: args.hookStyle,
    includeLesson: true,
    returnReport: true,
    teachingPersona: args.teachingPersona
  });

  if (!productEntry.problem || !productEntry.teachingScript || !productEntry.shotPlan || !productEntry.subtitleCuePlan) {
    console.error('Current equation is not video-renderable. Missing problem / teachingScript / shotPlan / subtitleCuePlan.');
    process.exitCode = 1;
    return;
  }

  const viewport = productEntry.videoRender?.recommendedViewport ?? DEFAULT_VIEWPORT;
  const renderPlan = buildVideoRenderPlan(productEntry.shotPlan, viewport);
  const html = buildVideoHtml({
    emphasisPlan: productEntry.emphasisPlan,
    equation: productEntry.normalizedEquation,
    familyLabel: productEntry.family.label,
    problem: productEntry.problem,
    publishingPack: productEntry.publishingPack,
    renderPlan,
    rhythmPlan: productEntry.rhythmPlan,
    shotPlan: productEntry.shotPlan,
    subtitleCuePlan: productEntry.subtitleCuePlan,
    teachingScript: productEntry.teachingScript,
    videoHook: productEntry.videoHook
  });

  ensureDir(path.join(process.cwd(), 'out'));

  const basename = `algebra-video-${slugify(productEntry.normalizedEquation)}`;
  const htmlPath = path.join(process.cwd(), 'out', `${basename}.html`);
  const coverHtmlPath = path.join(process.cwd(), 'out', `${basename}.cover.html`);
  const coverPngPath = path.join(process.cwd(), 'out', `${basename}.cover.png`);
  const timelinePath = path.join(process.cwd(), 'out', `${basename}-timeline.html`);
  const timelineScreenshotPath = path.join(process.cwd(), 'out', `${basename}-timeline.png`);
  const renderPlanPath = path.join(process.cwd(), 'out', `${basename}.render-plan.json`);
  const publishingPackPath = path.join(process.cwd(), 'out', `${basename}.publishing.json`);
  const productEntryPath = path.join(process.cwd(), 'out', `${basename}.product-entry.json`);
  const subtitleCuePath = path.join(process.cwd(), 'out', `${basename}.subtitle-cues.json`);
  const srtPath = path.join(process.cwd(), 'out', `${basename}.srt`);
  const voiceCuePath = path.join(process.cwd(), 'out', `${basename}.voice-cues.json`);
  const voiceCueSrtPath = path.join(process.cwd(), 'out', `${basename}.voice-cues.srt`);
  const voiceCueTextPath = path.join(process.cwd(), 'out', `${basename}.voice-cues.txt`);
  const voiceCuePauseDebugPath = path.join(process.cwd(), 'out', `${basename}.voice-cues.pause-debug.json`);
  const voiceCueSpeakableTextPath = path.join(process.cwd(), 'out', `${basename}.voice-cues.speakable.txt`);
  const audioDir = path.join(process.cwd(), 'out', `${basename}-audio`);
  const audioTrackPath = path.join(process.cwd(), 'out', `${basename}.audio-track.json`);
  const mixedAudioPath = path.join(process.cwd(), 'out', `${basename}.voice-track.wav`);
  const frameDir = path.join(process.cwd(), 'out', `${basename}-frames`);
  const mp4Path = path.join(process.cwd(), 'out', `${basename}.mp4`);
  const voicedMp4Path = path.join(process.cwd(), 'out', `${basename}.voiced.mp4`);

  fs.writeFileSync(htmlPath, html);
  if (productEntry.publishingPack) {
    fs.writeFileSync(
      coverHtmlPath,
      buildCoverHtml({
        equation: productEntry.normalizedEquation,
        familyLabel: productEntry.family.label,
        publishingPack: productEntry.publishingPack
      })
    );
  }
  fs.writeFileSync(
    timelinePath,
    `<!DOCTYPE html><meta charset="utf-8"><script>location.replace(${JSON.stringify(path.basename(htmlPath) + '?view=timeline')});</script>`
  );
  writeJson(renderPlanPath, renderPlan);
  if (productEntry.publishingPack) {
    writeJson(publishingPackPath, productEntry.publishingPack);
  }
  writeJson(productEntryPath, productEntry);
  writeJson(subtitleCuePath, productEntry.subtitleCuePlan);
  fs.writeFileSync(srtPath, serializeSubtitleCuePlanToSrt(productEntry.subtitleCuePlan));
  if (productEntry.voiceCuePlan) {
    writeJson(voiceCuePath, productEntry.voiceCuePlan);
    fs.writeFileSync(voiceCueSrtPath, serializeVoiceCuePlanToSrt(productEntry.voiceCuePlan));
    fs.writeFileSync(voiceCueTextPath, serializeVoiceCuePlanToText(productEntry.voiceCuePlan));
    fs.writeFileSync(voiceCuePauseDebugPath, serializeVoiceCuePauseDebug(productEntry.voiceCuePlan));
    fs.writeFileSync(
      voiceCueSpeakableTextPath,
      serializeVoiceCuePlanToSpeakableText(productEntry.voiceCuePlan)
    );
  }
  const audioTrackPlan =
    args.tts && productEntry.voiceCuePlan
      ? synthesizeVoiceCuePlan(productEntry.voiceCuePlan, {
          outputDir: audioDir,
          provider: args.tts
        })
      : undefined;
  let resolvedMixedAudioPath;
  let finalizedAudioTrackPlan = audioTrackPlan;

  if (audioTrackPlan) {
    const mixedAudioResult = ensureMixedAudioTrack({
      audioTrackPlan,
      outputPath: mixedAudioPath,
      runCommand,
      totalDurationMs: renderPlan.durationMs
    });

    finalizedAudioTrackPlan = mixedAudioResult.audioTrackPlan;
    resolvedMixedAudioPath = mixedAudioResult.mixedAudioPath;
    writeJson(audioTrackPath, finalizedAudioTrackPlan);
    (mixedAudioResult.warnings ?? []).forEach((warning) => {
      console.warn(`[tts] ${warning}`);
    });

    if (finalizedAudioTrackPlan.status !== 'available') {
      console.warn(`[tts] provider unavailable: ${(finalizedAudioTrackPlan.warnings ?? []).join(' ')}`);
    }
  }

  const htmlUrl = pathToFileURL(htmlPath).href;
  const chromePath = resolveChromePath();

  console.log(`[video] preview html: ${htmlPath}`);
  if (productEntry.publishingPack) {
    console.log(`[video] cover html: ${coverHtmlPath}`);
  }
  console.log(`[video] timeline html: ${timelinePath}`);
  console.log(`[video] render plan: ${renderPlanPath}`);
  if (productEntry.publishingPack) {
    console.log(`[video] publishing pack: ${publishingPackPath}`);
  }
  console.log(`[video] subtitle cues: ${subtitleCuePath}`);
  console.log(`[video] srt: ${srtPath}`);
  if (productEntry.voiceCuePlan) {
    console.log(`[video] voice cues: ${voiceCuePath}`);
    console.log(`[video] voice cue srt: ${voiceCueSrtPath}`);
    console.log(`[video] voice cue text: ${voiceCueTextPath}`);
    console.log(`[video] voice cue pause debug: ${voiceCuePauseDebugPath}`);
    console.log(`[video] voice cue speakable text: ${voiceCueSpeakableTextPath}`);
  }
  if (finalizedAudioTrackPlan) {
    console.log(`[tts] audio track plan: ${audioTrackPath}`);
    if (resolvedMixedAudioPath) {
      console.log(`[tts] mixed audio: ${resolvedMixedAudioPath}`);
    }
  }

  if (!chromePath) {
    console.log('[video] chrome not found, skipped cover png, frame and mp4 export.');
    return;
  }

  try {
    if (productEntry.publishingPack) {
      renderScreenshot({
        chromePath,
        outputPath: coverPngPath,
        url: pathToFileURL(coverHtmlPath).href,
        viewport
      });
      console.log(`[video] cover png: ${coverPngPath}`);
    }

    renderScreenshot({
      chromePath,
      outputPath: timelineScreenshotPath,
      url: `${htmlUrl}?view=timeline`,
      viewport: {
        height: 1800,
        width: 1440
      }
    });
    console.log(`[video] timeline screenshot: ${timelineScreenshotPath}`);
  } catch (error) {
    console.warn(`[video] timeline screenshot skipped: ${error.message}`);
  }

  if (args.htmlOnly) {
    console.log('[video] --html-only enabled, skipped frame and mp4 export.');
    return;
  }

  fs.rmSync(frameDir, {force: true, recursive: true});
  ensureDir(frameDir);

  try {
    const keyframeResult = renderKeyframes({
      chromePath,
      frameDir,
      htmlUrl,
      renderPlan,
      viewport
    });
    console.log(`[video] keyframes: ${keyframeResult.frameCount} -> ${frameDir}`);

    try {
      renderMp4FromFrames({
        concatFilePath: keyframeResult.concatFilePath,
        fps: renderPlan.fps,
        outputPath: mp4Path
      });
      console.log(`[video] mp4: ${mp4Path}`);

      if (finalizedAudioTrackPlan) {
        const finalizedVideoAudio = finalizeVideoAudio({
          audioTrackPlan: finalizedAudioTrackPlan,
          audioPath: resolvedMixedAudioPath,
          inputMp4Path: mp4Path,
          outputPath: voicedMp4Path,
          runCommand
        });
        finalizedAudioTrackPlan = finalizedVideoAudio.audioTrackPlan ?? finalizedAudioTrackPlan;
        writeJson(audioTrackPath, finalizedAudioTrackPlan);

        finalizedVideoAudio.warnings.forEach((warning) => {
          console.warn(`[tts] ${warning}`);
        });
        console.log(
          finalizedVideoAudio.hasAudioStream
            ? `[video] voiced mp4: ${voicedMp4Path}`
            : `[video] silent fallback mp4: ${voicedMp4Path}`
        );
      }
    } catch (error) {
      console.warn(`[video] ffmpeg merge failed: ${error.message}`);
    }
  } catch (error) {
    console.warn(`[video] frame export failed: ${error.message}`);
  }
};

void main();
