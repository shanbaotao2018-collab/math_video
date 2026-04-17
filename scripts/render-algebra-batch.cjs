#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const {
  ensureMixedAudioTrack,
  finalizeVideoAudio
} = require('./audio-finalization.cjs');

const COMPILED_ROOT = '/tmp/math-video-batch';
const COMPILED_INTEGRATION_PATH = path.join(COMPILED_ROOT, 'engine/integration/index.js');

const DEFAULT_VIEWPORT = {
  fps: 30,
  height: 1920,
  width: 1080
};

const loadIntegration = () => {
  return require(COMPILED_INTEGRATION_PATH);
};

const parseArgs = (argv) => {
  const args = {
    dataset: '',
    hookStyle: undefined,
    outputRoot: 'out',
    presentationMode: undefined,
    teachingPersona: undefined,
    tts: undefined,
    video: false,
    list: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--dataset') {
      args.dataset = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (value === '--output-root' || value === '--outputRoot') {
      args.outputRoot = argv[index + 1] ?? 'out';
      index += 1;
      continue;
    }

    if (value === '--hook-style' || value === '--hookStyle') {
      args.hookStyle = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--presentation-mode' || value === '--presentationMode') {
      args.presentationMode = argv[index + 1];
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

    if (value === '--video') {
      args.video = true;
      continue;
    }

    if (value === '--list') {
      args.list = true;
      continue;
    }
  }

  return args;
};

const buildContentProgrammingInput = ({episodePlan, productEntry}) => {
  return {
    coverText: productEntry.publishingPack?.coverText,
    emphasisCueCount: productEntry.emphasisPlan?.cues.length,
    emphasisKinds: Array.from(new Set((productEntry.emphasisPlan?.cues ?? []).map((cue) => cue.kind))),
    episodeId: episodePlan.episodeId,
    episodeIndex: episodePlan.episodeIndex,
    family: productEntry.family.id,
    hookStyle: productEntry.videoHook?.style,
    hookText: productEntry.videoHook?.text,
    presentationMode: productEntry.presentationStrategy.id,
    qualityTier: productEntry.qualityTier,
    title: productEntry.publishingPack?.title
  };
};

const omitUndefined = (value) => {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, {recursive: true});
};

const writeJson = (filePath, value) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const writeText = (filePath, value) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
};

const resolveOutputPath = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
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

const renderScreenshot = ({chromePath, outputPath, url, viewport}) => {
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

const renderKeyframes = ({chromePath, frameDir, htmlUrl, renderPlan, viewport}) => {
  const concatFilePath = path.join(frameDir, 'frames.txt');
  const concatLines = [];

  renderPlan.shots.forEach((shot, index) => {
    const shotDurationMs = Math.max(1, shot.endMs - shot.startMs);
    const timeMs = Math.min(shot.endMs - 1, shot.startMs + Math.floor(shotDurationMs / 2));
    const frameName = `frame-${String(index + 1).padStart(5, '0')}.png`;
    const framePath = path.join(frameDir, frameName);

    renderScreenshot({
      chromePath,
      outputPath: framePath,
      url: `${htmlUrl}?t=${timeMs}`,
      viewport
    });

    concatLines.push(`file '${framePath.replace(/'/g, "'\\''")}'`);
    concatLines.push(`duration ${(shotDurationMs / 1000).toFixed(3)}`);
  });

  if (renderPlan.shots.length > 0) {
    const lastFramePath = path.join(frameDir, `frame-${String(renderPlan.shots.length).padStart(5, '0')}.png`);
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
  const integration = loadIntegration();
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    integration.listBatchDatasets().forEach((dataset) => {
      console.log(`[batch] ${dataset.id}: ${dataset.name} (${dataset.equations.length} equations)`);
    });
    return;
  }

  if (!args.dataset) {
    console.error(
      'Usage: node scripts/render-algebra-batch.cjs --dataset <name> [--hook-style value] [--presentation-mode value] [--persona value] [--tts mock|real] [--video]'
    );
    process.exitCode = 1;
    return;
  }

  const dataset = integration.getBatchDataset(args.dataset);

  if (!dataset) {
    console.error(`[batch] unknown dataset: ${args.dataset}`);
    console.error(`[batch] available datasets: ${integration.listBatchDatasets().map((item) => item.id).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const plan = integration.buildBatchProductionPlan(dataset, {
    includeAudioTrack: Boolean(args.tts),
    includeVideo: args.video,
    outputRoot: args.outputRoot
  });
  const seriesRoot = resolveOutputPath(`${args.outputRoot}/series-${integration.slugifyBatchPathPart(dataset.seriesId)}`);
  const manifestPath = path.join(seriesRoot, 'batch-manifest.json');
  const chromePath = args.video ? resolveChromePath() : null;
  const episodeResults = [];
  const provisionalEpisodeEntries = [];
  const explicitExecutionOverrides = omitUndefined({
    hookStyle: args.hookStyle,
    presentationMode: args.presentationMode,
    teachingPersona: args.teachingPersona
  });

  ensureDir(seriesRoot);

  for (const [index, datasetEquation] of dataset.equations.entries()) {
    const episodePlan = plan.episodes[index];
    const provisionalProductEntry = await integration.buildAlgebraProductEntry(datasetEquation.equation, {
      ai: false,
      hookStyle: datasetEquation.hookStyle,
      includeLesson: false,
      presentationMode: datasetEquation.presentationMode,
      publishingSeries: {
        episodeIndex: episodePlan.episodeIndex,
        seriesId: dataset.seriesId,
        seriesName: dataset.seriesName
      },
      returnReport: false,
      teachingPersona: datasetEquation.teachingPersona
    });

    provisionalEpisodeEntries.push({
      episodePlan,
      productEntry: provisionalProductEntry
    });
  }

  const contentProgramming = integration.buildBatchContentProgrammingPlan(
    dataset,
    provisionalEpisodeEntries.map(({episodePlan, productEntry}) =>
      buildContentProgrammingInput({episodePlan, productEntry})
    )
  );
  const episodeProgrammingById = new Map(
    contentProgramming.episodes.map((episodeProgramming) => [episodeProgramming.episodeId, episodeProgramming])
  );

  for (const [index, datasetEquation] of dataset.equations.entries()) {
    const episodePlan = plan.episodes[index];
    const episodeDir = resolveOutputPath(episodePlan.outputDir);
    const episodeProgramming = episodeProgrammingById.get(episodePlan.episodeId);
    const templateExecution = integration.resolveBatchEpisodeTemplateExecution({
      explicitOverrides: explicitExecutionOverrides,
      templateSnapshot: episodeProgramming?.templateSnapshot
    });
    const buildOverrides = {
      hookStyle: templateExecution.buildOverrides.hookStyle ?? datasetEquation.hookStyle,
      presentationMode: templateExecution.buildOverrides.presentationMode ?? datasetEquation.presentationMode,
      teachingPersona: templateExecution.buildOverrides.teachingPersona ?? datasetEquation.teachingPersona
    };

    ensureDir(episodeDir);

    const productEntry = integration.applyBatchTemplateDeepExecution(
      integration.applyBatchTemplateExecutionMetadata(
        await integration.buildAlgebraProductEntry(datasetEquation.equation, {
          ai: false,
          ...omitUndefined(buildOverrides),
          includeLesson: true,
          publishingSeries: {
            episodeIndex: episodePlan.episodeIndex,
            seriesId: dataset.seriesId,
            seriesName: dataset.seriesName
          },
          returnReport: true
        }),
        templateExecution
      ),
      episodeProgramming?.templateSnapshot
    );

    const assetPaths = {};

    writeJson(resolveOutputPath(episodePlan.assetPaths.productEntry), productEntry);
    assetPaths.productEntry = episodePlan.assetPaths.productEntry;

    if (!productEntry.problem || !productEntry.teachingScript || !productEntry.shotPlan || !productEntry.subtitleCuePlan) {
      episodeResults.push({
        assetPaths,
        episodeId: episodePlan.episodeId,
        episodeIndex: episodePlan.episodeIndex,
        episodeNumber: episodePlan.episodeNumber,
        equation: datasetEquation.equation,
        outputDir: episodePlan.outputDir,
        renderable: false,
        warnings: ['Missing problem / teachingScript / shotPlan / subtitleCuePlan.']
      });
      continue;
    }

    const viewport = productEntry.videoRender?.recommendedViewport ?? DEFAULT_VIEWPORT;
    const renderPlan = integration.buildVideoRenderPlan(productEntry.shotPlan, viewport);
    const html = integration.buildVideoHtml({
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
    const coverHtml = productEntry.publishingPack
      ? integration.buildCoverHtml({
          equation: productEntry.normalizedEquation,
          familyLabel: productEntry.family.label,
          publishingPack: productEntry.publishingPack
        })
      : undefined;

    writeText(resolveOutputPath(episodePlan.assetPaths.html), html);
    if (coverHtml) {
      writeText(resolveOutputPath(episodePlan.assetPaths.coverHtml), coverHtml);
      assetPaths.coverHtml = episodePlan.assetPaths.coverHtml;
    }
    writeText(
      resolveOutputPath(episodePlan.assetPaths.timelineHtml),
      `<!DOCTYPE html><meta charset="utf-8"><script>location.replace(${JSON.stringify('preview.html?view=timeline')});</script>`
    );
    writeJson(resolveOutputPath(episodePlan.assetPaths.renderPlan), renderPlan);
    writeJson(resolveOutputPath(episodePlan.assetPaths.subtitleCues), productEntry.subtitleCuePlan);
    writeText(resolveOutputPath(episodePlan.assetPaths.srt), integration.serializeSubtitleCuePlanToSrt(productEntry.subtitleCuePlan));
    assetPaths.html = episodePlan.assetPaths.html;
    assetPaths.timelineHtml = episodePlan.assetPaths.timelineHtml;
    assetPaths.renderPlan = episodePlan.assetPaths.renderPlan;
    assetPaths.subtitleCues = episodePlan.assetPaths.subtitleCues;
    assetPaths.srt = episodePlan.assetPaths.srt;

    if (productEntry.publishingPack) {
      writeJson(resolveOutputPath(episodePlan.assetPaths.publishing), productEntry.publishingPack);
      assetPaths.publishing = episodePlan.assetPaths.publishing;
    }

    if (productEntry.voiceCuePlan) {
      writeJson(resolveOutputPath(episodePlan.assetPaths.voiceCues), productEntry.voiceCuePlan);
      writeText(resolveOutputPath(episodePlan.assetPaths.voiceCueSrt), integration.serializeVoiceCuePlanToSrt(productEntry.voiceCuePlan));
      writeText(resolveOutputPath(episodePlan.assetPaths.voiceCueText), integration.serializeVoiceCuePlanToText(productEntry.voiceCuePlan));
      writeText(
        resolveOutputPath(episodePlan.assetPaths.voiceCueSpeakableText),
        integration.serializeVoiceCuePlanToSpeakableText(productEntry.voiceCuePlan)
      );
      assetPaths.voiceCues = episodePlan.assetPaths.voiceCues;
      assetPaths.voiceCueSpeakableText = episodePlan.assetPaths.voiceCueSpeakableText;
      assetPaths.voiceCueSrt = episodePlan.assetPaths.voiceCueSrt;
      assetPaths.voiceCueText = episodePlan.assetPaths.voiceCueText;
    }

    let mixedAudioPath;
    let finalizedAudioTrackPlan;

    if (args.tts && productEntry.voiceCuePlan) {
      const audioTrackPlan = integration.synthesizeVoiceCuePlan(productEntry.voiceCuePlan, {
        outputDir: path.join(episodeDir, 'audio'),
        provider: args.tts
      });
      const mixedAudioResult = ensureMixedAudioTrack({
        audioTrackPlan,
        outputPath: path.join(episodeDir, 'voice-track.wav'),
        runCommand,
        totalDurationMs: renderPlan.durationMs
      });
      finalizedAudioTrackPlan = mixedAudioResult.audioTrackPlan;
      mixedAudioPath = mixedAudioResult.mixedAudioPath;
      writeJson(resolveOutputPath(episodePlan.assetPaths.audioTrack), finalizedAudioTrackPlan);
      assetPaths.audioTrack = episodePlan.assetPaths.audioTrack;
      (mixedAudioResult.warnings ?? []).forEach((warning) => {
        console.warn(`[batch] ${episodePlan.episodeNumber} audio warning: ${warning}`);
      });
    }

    if (args.video) {
      if (!chromePath) {
        console.warn(`[batch] chrome not found, skipped video for ${episodePlan.episodeNumber}.`);
      } else {
        try {
          const frameDir = path.join(episodeDir, 'frames');
          fs.rmSync(frameDir, {force: true, recursive: true});
          ensureDir(frameDir);
          if (coverHtml && episodePlan.assetPaths.coverPng) {
            renderScreenshot({
              chromePath,
              outputPath: resolveOutputPath(episodePlan.assetPaths.coverPng),
              url: pathToFileURL(resolveOutputPath(episodePlan.assetPaths.coverHtml)).href,
              viewport
            });
            assetPaths.coverPng = episodePlan.assetPaths.coverPng;
          }

          const keyframeResult = renderKeyframes({
            chromePath,
            frameDir,
            htmlUrl: pathToFileURL(resolveOutputPath(episodePlan.assetPaths.html)).href,
            renderPlan,
            viewport
          });

          renderMp4FromFrames({
            concatFilePath: keyframeResult.concatFilePath,
            fps: renderPlan.fps,
            outputPath: resolveOutputPath(episodePlan.assetPaths.mp4)
          });
          assetPaths.mp4 = episodePlan.assetPaths.mp4;

          if (finalizedAudioTrackPlan) {
            const finalizedVideoAudio = finalizeVideoAudio({
              audioTrackPlan: finalizedAudioTrackPlan,
              audioPath: mixedAudioPath,
              inputMp4Path: resolveOutputPath(episodePlan.assetPaths.mp4),
              outputPath: resolveOutputPath(episodePlan.assetPaths.voicedMp4),
              runCommand
            });
          finalizedAudioTrackPlan = finalizedVideoAudio.audioTrackPlan ?? finalizedAudioTrackPlan;
          writeJson(resolveOutputPath(episodePlan.assetPaths.audioTrack), finalizedAudioTrackPlan);

          finalizedVideoAudio.warnings.forEach((warning) => {
            console.warn(`[batch] ${episodePlan.episodeNumber} audio warning: ${warning}`);
          });
            assetPaths.voicedMp4 = episodePlan.assetPaths.voicedMp4;
          }
        } catch (error) {
          console.warn(`[batch] video skipped for ${episodePlan.episodeNumber}: ${error.message}`);
        }
      }
    }

    episodeResults.push({
      assetPaths,
      episodeId: episodePlan.episodeId,
      episodeIndex: episodePlan.episodeIndex,
      episodeNumber: episodePlan.episodeNumber,
      equation: datasetEquation.equation,
      outputDir: episodePlan.outputDir,
      appliedDurationBandSec: productEntry.appliedDurationBandSec,
      appliedEmphasisBias: productEntry.appliedEmphasisBias,
      appliedOverrides: productEntry.appliedOverrides,
      appliedOutroStyle: productEntry.appliedOutroStyle,
      appliedTemplateId: productEntry.appliedTemplateId,
      contentProgramming: episodeProgramming,
      publishingTitle: productEntry.publishingPack?.title,
      renderable: true
    });

    console.log(`[batch] ${episodePlan.episodeNumber} ${datasetEquation.equation} -> ${episodePlan.outputDir}`);
  }

  const manifestEpisodes = episodeResults;
  const seriesRhythmTemplates = Array.from(
    new Map(
      [
        contentProgramming.dataset.templateSnapshot,
        contentProgramming.series.templateSnapshot,
        ...contentProgramming.episodes.map((episodeProgramming) => episodeProgramming.templateSnapshot)
      ]
        .filter(Boolean)
        .map((template) => [template.id, template])
    ).values()
  );

  const manifest = {
    dataset: {
      id: dataset.id,
      name: dataset.name,
      contentProgramming: contentProgramming.dataset
    },
    episodeCount: manifestEpisodes.length,
    episodes: manifestEpisodes,
    generatedAt: new Date().toISOString(),
    series: {
      ...plan.series,
      contentProgramming: contentProgramming.series
    },
    contentProgramming,
    seriesRhythmTemplates
  };

  writeJson(manifestPath, manifest);
  console.log(`[batch] manifest: ${manifestPath}`);
};

void main();
