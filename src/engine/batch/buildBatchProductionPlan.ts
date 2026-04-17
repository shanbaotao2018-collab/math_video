import type {
  BatchDataset,
  BatchDatasetEquation,
  BatchEpisodeContentProgrammingInput,
  BatchEpisodePlan,
  BatchProductionOptions,
  BatchProductionPlan
} from './batchTypes';
import {buildBatchContentProgrammingPlan} from './buildBatchContentProgrammingPlan';

export const formatEpisodeNumber = (episodeIndex: number) => {
  return String(episodeIndex).padStart(3, '0');
};

export const slugifyBatchPathPart = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
};

const joinPath = (...parts: string[]) => {
  return parts
    .map((part, index) => {
      const trimmed = index === 0 ? part.replace(/\/+$/g, '') : part.replace(/^\/+|\/+$/g, '');
      return trimmed;
    })
    .filter(Boolean)
    .join('/');
};

const getEpisodeTags = (dataset: BatchDataset, equation: BatchDatasetEquation) => {
  return Array.from(new Set([...(dataset.tags ?? []), ...(equation.tags ?? [])]));
};

export const buildBatchProductionPlan = (
  dataset: BatchDataset,
  options: BatchProductionOptions = {}
): BatchProductionPlan => {
  const outputRoot = options.outputRoot ?? 'out';
  const seriesDir = joinPath(outputRoot, `series-${slugifyBatchPathPart(dataset.seriesId)}`);
  const contentProgrammingInputs: BatchEpisodeContentProgrammingInput[] = [];
  const episodes: BatchEpisodePlan[] = dataset.equations.map((equation, index) => {
    const episodeIndex = index + 1;
    const episodeNumber = formatEpisodeNumber(episodeIndex);
    const equationSlug = slugifyBatchPathPart(equation.id ?? equation.equation);
    const episodeId = `${episodeNumber}-${equationSlug}`;
    const outputDir = joinPath(seriesDir, episodeId);

    contentProgrammingInputs.push({
      episodeId,
      episodeIndex,
      family: equation.family,
      hookStyle: equation.hookStyle,
      presentationMode: equation.presentationMode,
      title: equation.equation
    });

    return {
      assetPaths: {
        ...(options.includeAudioTrack ? {audioTrack: joinPath(outputDir, 'audio-track.json')} : {}),
        coverHtml: joinPath(outputDir, 'cover.html'),
        ...(options.includeVideo ? {coverPng: joinPath(outputDir, 'cover.png')} : {}),
        creativeVariantsDir: joinPath(outputDir, 'variants'),
        html: joinPath(outputDir, 'preview.html'),
        ...(options.includeVideo
          ? {
              mp4: joinPath(outputDir, 'video.mp4'),
              voicedMp4: joinPath(outputDir, 'video.voiced.mp4')
            }
          : {}),
        productEntry: joinPath(outputDir, 'product-entry.json'),
        publishing: joinPath(outputDir, 'publishing.json'),
        renderPlan: joinPath(outputDir, 'render-plan.json'),
        srt: joinPath(outputDir, 'subtitle.srt'),
        subtitleCues: joinPath(outputDir, 'subtitle-cues.json'),
        timelineHtml: joinPath(outputDir, 'timeline.html'),
        voiceCueSpeakableText: joinPath(outputDir, 'voice-cues.speakable.txt'),
        voiceCueSrt: joinPath(outputDir, 'voice-cues.srt'),
        voiceCueText: joinPath(outputDir, 'voice-cues.txt'),
        voiceCues: joinPath(outputDir, 'voice-cues.json')
      },
      difficulty: equation.difficulty ?? dataset.difficulty,
      episodeId,
      episodeIndex,
      episodeNumber,
      equation: equation.equation,
      outputDir,
      tags: getEpisodeTags(dataset, equation)
    };
  });
  const contentProgramming = buildBatchContentProgrammingPlan(dataset, contentProgrammingInputs);
  const episodeProgrammingById = new Map(
    contentProgramming.episodes.map((episodeProgramming) => [episodeProgramming.episodeId, episodeProgramming])
  );

  episodes.forEach((episode) => {
    episode.contentProgramming = episodeProgrammingById.get(episode.episodeId);
  });

  return {
    contentProgramming,
    dataset,
    episodes,
    outputRoot,
    series: {
      episodeCount: episodes.length,
      seriesId: dataset.seriesId,
      seriesName: dataset.seriesName
    }
  };
};
