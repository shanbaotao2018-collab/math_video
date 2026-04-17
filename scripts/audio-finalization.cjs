const fs = require('node:fs');

const FFPROBE_PATH = '/opt/homebrew/bin/ffprobe';
const FFMPEG_PATH = '/opt/homebrew/bin/ffmpeg';

const cloneTrackPlan = (audioTrackPlan) => {
  return {
    ...audioTrackPlan,
    ...(audioTrackPlan.mixedFilePath ? {mixedFilePath: audioTrackPlan.mixedFilePath} : {}),
    ...(audioTrackPlan.providerResolutionOrder
      ? {providerResolutionOrder: {...audioTrackPlan.providerResolutionOrder}}
      : {}),
    ...(audioTrackPlan.qa
      ? {
          qa: {
            ...audioTrackPlan.qa,
            warnings: [...(audioTrackPlan.qa.warnings ?? [])]
          }
        }
      : {}),
    ...(audioTrackPlan.resolvedVoice ? {resolvedVoice: {...audioTrackPlan.resolvedVoice}} : {}),
    segments: (audioTrackPlan.segments ?? []).map((segment) => ({
      ...segment,
      ...(segment.qa
        ? {
            qa: {
              ...segment.qa,
              warnings: [...(segment.qa.warnings ?? [])]
            }
          }
        : {})
    })),
    ...(audioTrackPlan.warnings ? {warnings: [...audioTrackPlan.warnings]} : {})
  };
};

const pushWarning = (warnings, warning) => {
  if (warning) {
    warnings.push(warning);
  }
};

const getFileSizeBytes = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return 0;
  }

  try {
    return fs.statSync(filePath).size;
  } catch (_error) {
    return 0;
  }
};

const getMediaDurationSec = ({filePath, runCommand}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    const result = runCommand(FFPROBE_PATH, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nokey=1:noprint_wrappers=1',
      filePath
    ]);
    const durationSec = Number.parseFloat((result.stdout || '').trim());

    return Number.isFinite(durationSec) ? durationSec : undefined;
  } catch (_error) {
    return undefined;
  }
};

const hasAudioStream = ({filePath, runCommand}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  try {
    const result = runCommand(FFPROBE_PATH, [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      filePath
    ]);

    return Boolean((result.stdout || '').trim());
  } catch (_error) {
    return false;
  }
};

const validateAudioFile = ({filePath, runCommand}) => {
  const warnings = [];

  if (!filePath || !fs.existsSync(filePath)) {
    return {
      durationMs: undefined,
      exists: false,
      fileSizeBytes: 0,
      valid: false,
      warning: `audio file missing: ${filePath ?? 'undefined'}`,
      warnings: [`audio file missing: ${filePath ?? 'undefined'}`]
    };
  }

  const fileSizeBytes = getFileSizeBytes(filePath);

  if (fileSizeBytes <= 0) {
    pushWarning(warnings, `audio file empty: ${filePath}`);
  }

  const durationSec = getMediaDurationSec({filePath, runCommand});

  if (!durationSec || durationSec <= 0) {
    pushWarning(warnings, `audio duration invalid: ${filePath}`);
    return {
      durationMs: undefined,
      exists: true,
      fileSizeBytes,
      valid: false,
      warning: warnings[0],
      warnings
    };
  }

  return {
    durationMs: Math.round(durationSec * 1000),
    exists: true,
    fileSizeBytes,
    durationSec,
    valid: warnings.length === 0,
    warning: warnings[0],
    warnings
  };
};

const getPeakVolumeDb = ({filePath, runCommand}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    const result = runCommand(FFMPEG_PATH, [
      '-i',
      filePath,
      '-af',
      'volumedetect',
      '-f',
      'null',
      '/dev/null'
    ]);
    const output = `${result.stderr || ''}\n${result.stdout || ''}`;
    const match = output.match(/max_volume:\s+(-?[\d.]+|-inf)\s+dB/i);

    if (!match) {
      return undefined;
    }

    if (match[1] === '-inf') {
      return Number.NEGATIVE_INFINITY;
    }

    const peakDb = Number.parseFloat(match[1]);
    return Number.isFinite(peakDb) ? peakDb : undefined;
  } catch (_error) {
    return undefined;
  }
};

const normalizeSegmentTimeline = (segments) => {
  let cursorMs = 0;

  return (segments ?? []).map((segment) => {
    const durationMs = Math.max(
      1,
      Math.round(segment.qa?.durationMs ?? segment.generatedDurationMs ?? segment.durationMs ?? 1)
    );
    const normalizedSegment = {
      ...segment,
      durationMs,
      startMs: cursorMs
    };

    cursorMs += durationMs;
    return normalizedSegment;
  });
};

const hasSegmentOverlap = (segments) => {
  for (let index = 1; index < (segments ?? []).length; index += 1) {
    const previousSegment = segments[index - 1];
    const currentSegment = segments[index];

    if ((currentSegment.startMs ?? 0) < (previousSegment.startMs ?? 0) + (previousSegment.durationMs ?? 0)) {
      return true;
    }
  }

  return false;
};

const mergeTrackWarnings = (trackPlan, warnings) => {
  const mergedWarnings = [...warnings];

  return {
    ...trackPlan,
    overlapDetected: hasSegmentOverlap(trackPlan.segments ?? []),
    qa: {
      ...(trackPlan.qa ?? {
        segmentCount: trackPlan.segments?.length ?? 0,
        validSegmentCount: trackPlan.segments?.length ?? 0
      }),
      warnings: mergedWarnings
    },
    ...(mergedWarnings.length > 0 ? {warnings: mergedWarnings} : {})
  };
};

const sanitizeAudioTrackPlan = ({audioTrackPlan, runCommand}) => {
  const normalizedPlan = cloneTrackPlan(audioTrackPlan);
  const warnings = [...(normalizedPlan.warnings ?? []), ...(normalizedPlan.qa?.warnings ?? [])];
  const originalSegments = normalizedPlan.segments ?? [];
  const validatedSegments = originalSegments
    .map((segment) => {
      const segmentWarnings = [];

      if (segment.durationMs <= 0) {
        pushWarning(segmentWarnings, `audio segment duration invalid: ${segment.cueId}`);
      }

      const validation = validateAudioFile({filePath: segment.filePath, runCommand});
      segmentWarnings.push(...(validation.warnings ?? []));
      const qa = {
        durationMs: validation.durationMs,
        exists: validation.exists,
        fileSizeBytes: validation.fileSizeBytes,
        valid: validation.valid && segment.durationMs > 0,
        warnings: segmentWarnings
      };

      segmentWarnings.forEach((warning) => {
        pushWarning(warnings, warning);
      });

      return {
        ...segment,
        qa
      };
    })
    .filter((segment) => segment.qa.valid);
  const normalizedSegments = normalizeSegmentTimeline(validatedSegments);

  return mergeTrackWarnings(
    {
      ...normalizedPlan,
      overlapDetected: false,
      qa: {
        ...(normalizedPlan.qa ?? {}),
        segmentCount: originalSegments.length,
        validSegmentCount: normalizedSegments.length,
        warnings
      },
      segments: normalizedSegments,
      status: normalizedSegments.length > 0 ? 'available' : 'unavailable',
      timelineMode: 'sequential'
    },
    warnings
  );
};

const enrichMixedAudioQa = ({
  audioTrackPlan,
  mixedAudioPath,
  runCommand,
  totalDurationMs
}) => {
  const warnings = [...(audioTrackPlan.warnings ?? []), ...(audioTrackPlan.qa?.warnings ?? [])];
  const validation = validateAudioFile({filePath: mixedAudioPath, runCommand});

  if (!validation.valid) {
    pushWarning(warnings, validation.warning);
    return mergeTrackWarnings(
      {
        ...audioTrackPlan,
        qa: {
          ...(audioTrackPlan.qa ?? {}),
          expectedDurationMs: totalDurationMs,
          mixedFileSizeBytes: validation.fileSizeBytes,
          segmentCount: audioTrackPlan.qa?.segmentCount ?? audioTrackPlan.segments.length,
          validSegmentCount: audioTrackPlan.qa?.validSegmentCount ?? audioTrackPlan.segments.length,
          warnings
        },
        status: 'unavailable'
      },
      warnings
    );
  }

  const peakDb = getPeakVolumeDb({filePath: mixedAudioPath, runCommand});
  const isNonSilent =
    typeof peakDb === 'number'
      ? peakDb > -55
      : validation.fileSizeBytes > 1024;
  const mixedDurationMs = validation.durationMs;
  const durationToleranceMs = Math.max(500, Math.round(totalDurationMs * 0.08));

  if (
    typeof mixedDurationMs === 'number' &&
    totalDurationMs > 0 &&
    Math.abs(mixedDurationMs - totalDurationMs) > durationToleranceMs
  ) {
    pushWarning(
      warnings,
      `mixed audio duration drifted from render plan: expected about ${totalDurationMs}ms, got ${mixedDurationMs}ms`
    );
  }

  if (!isNonSilent) {
    pushWarning(warnings, `mixed audio appears silent: ${mixedAudioPath}`);
  }

  return mergeTrackWarnings(
    {
      ...audioTrackPlan,
      mixedFilePath: mixedAudioPath,
      qa: {
        ...(audioTrackPlan.qa ?? {}),
        expectedDurationMs: totalDurationMs,
        isNonSilent,
        mixedDurationMs,
        mixedFileSizeBytes: validation.fileSizeBytes,
        ...(typeof peakDb === 'number' ? {mixedPeakDb: peakDb} : {}),
        segmentCount: audioTrackPlan.qa?.segmentCount ?? audioTrackPlan.segments.length,
        validSegmentCount: audioTrackPlan.qa?.validSegmentCount ?? audioTrackPlan.segments.length,
        warnings
      },
      status: isNonSilent ? audioTrackPlan.status : 'unavailable'
    },
    warnings
  );
};

const ensureMixedAudioTrack = ({
  audioTrackPlan,
  outputPath,
  runCommand,
  totalDurationMs
}) => {
  const normalizedPlan = sanitizeAudioTrackPlan({audioTrackPlan, runCommand});
  const warnings = [...(normalizedPlan.warnings ?? [])];

  if (normalizedPlan.status !== 'available' || normalizedPlan.segments.length === 0) {
    return {
      audioTrackPlan: mergeTrackWarnings(
        {
          ...normalizedPlan,
          qa: {
            ...(normalizedPlan.qa ?? {}),
            expectedDurationMs: totalDurationMs,
            segmentCount: normalizedPlan.qa?.segmentCount ?? 0,
            validSegmentCount: normalizedPlan.qa?.validSegmentCount ?? 0,
            warnings
          }
        },
        warnings
      ),
      warnings
    };
  }

  const existingMixedValidation = normalizedPlan.mixedFilePath
    ? validateAudioFile({filePath: normalizedPlan.mixedFilePath, runCommand})
    : {valid: false};

  if (existingMixedValidation.valid) {
    if (normalizedPlan.mixedFilePath !== outputPath) {
      fs.copyFileSync(normalizedPlan.mixedFilePath, outputPath);
    }

    return {
      audioDurationSec: existingMixedValidation.durationSec,
      audioTrackPlan: enrichMixedAudioQa({
        audioTrackPlan: normalizedPlan,
        mixedAudioPath: outputPath,
        runCommand,
        totalDurationMs
      }),
      mixedAudioPath: outputPath,
      warnings
    };
  }

  const concatListPath = `${outputPath}.concat.txt`;
  const concatList = normalizedPlan.segments
    .map((segment) => `file '${segment.filePath.replace(/'/g, "'\\''")}'`)
    .join('\n');

  fs.writeFileSync(concatListPath, concatList + '\n');

  try {
    runCommand(FFMPEG_PATH, [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-ac',
      '1',
      '-ar',
      '24000',
      '-c:a',
      'pcm_s16le',
      outputPath
    ]);
  } catch (error) {
    pushWarning(warnings, `audio mix failed: ${error.message}`);
    return {
      audioTrackPlan: mergeTrackWarnings(
        {
          ...normalizedPlan,
          qa: {
            ...(normalizedPlan.qa ?? {}),
            expectedDurationMs: totalDurationMs,
            segmentCount: normalizedPlan.qa?.segmentCount ?? normalizedPlan.segments.length,
            validSegmentCount: normalizedPlan.qa?.validSegmentCount ?? normalizedPlan.segments.length,
            warnings
          },
          status: 'unavailable'
        },
        warnings
      ),
      warnings
    };
  } finally {
    if (fs.existsSync(concatListPath)) {
      fs.unlinkSync(concatListPath);
    }
  }

  const mixedValidation = validateAudioFile({filePath: outputPath, runCommand});

  if (!mixedValidation.valid) {
    pushWarning(warnings, mixedValidation.warning);
    return {
      audioTrackPlan: mergeTrackWarnings(
        {
          ...normalizedPlan,
          qa: {
            ...(normalizedPlan.qa ?? {}),
            expectedDurationMs: totalDurationMs,
            mixedFileSizeBytes: mixedValidation.fileSizeBytes,
            segmentCount: normalizedPlan.qa?.segmentCount ?? normalizedPlan.segments.length,
            validSegmentCount: normalizedPlan.qa?.validSegmentCount ?? normalizedPlan.segments.length,
            warnings
          },
          status: 'unavailable'
        },
        warnings
      ),
      warnings
    };
  }

  return {
    audioDurationSec: mixedValidation.durationSec,
    audioTrackPlan: enrichMixedAudioQa({
      audioTrackPlan: normalizedPlan,
      mixedAudioPath: outputPath,
      runCommand,
      totalDurationMs
    }),
    mixedAudioPath: outputPath,
    warnings
  };
};

const finalizeVideoAudio = ({
  audioTrackPlan,
  audioPath,
  inputMp4Path,
  outputPath,
  runCommand
}) => {
  const warnings = [];
  const audioValidation = audioPath ? validateAudioFile({filePath: audioPath, runCommand}) : {valid: false};
  const videoDurationSec = getMediaDurationSec({filePath: inputMp4Path, runCommand}) ?? 0;

  if (!audioValidation.valid) {
    pushWarning(
      warnings,
      audioPath ? audioValidation.warning : 'audio unavailable, generated silent fallback video.'
    );
    fs.copyFileSync(inputMp4Path, outputPath);
    return {
      audioTrackPlan: audioTrackPlan
        ? mergeTrackWarnings(
            {
              ...cloneTrackPlan(audioTrackPlan),
              qa: {
                ...(audioTrackPlan.qa ?? {}),
                hasAudioStream: false,
                segmentCount: audioTrackPlan.qa?.segmentCount ?? audioTrackPlan.segments?.length ?? 0,
                validSegmentCount: audioTrackPlan.qa?.validSegmentCount ?? audioTrackPlan.segments?.length ?? 0,
                warnings: [...(audioTrackPlan.qa?.warnings ?? []), ...warnings]
              },
              ...(audioTrackPlan.speechMode === 'real_speech' ? {status: 'unavailable'} : {})
            },
            [...(audioTrackPlan.warnings ?? []), ...warnings]
          )
        : undefined,
      hasAudioStream: false,
      outputPath,
      warnings
    };
  }

  try {
    const audioDurationSec = audioValidation.durationSec ?? 0;
    const padDurationSec = Math.max(0, audioDurationSec - videoDurationSec);

    if (padDurationSec > 0.05) {
      runCommand(FFMPEG_PATH, [
        '-y',
        '-i',
        inputMp4Path,
        '-i',
        audioPath,
        '-filter_complex',
        `[0:v]tpad=stop_mode=clone:stop_duration=${padDurationSec.toFixed(3)}[v]`,
        '-map',
        '[v]',
        '-map',
        '1:a:0',
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        outputPath
      ]);
    } else {
      runCommand(FFMPEG_PATH, [
        '-y',
        '-i',
        inputMp4Path,
        '-i',
        audioPath,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-shortest',
        outputPath
      ]);
    }
  } catch (error) {
    pushWarning(warnings, `audio mux failed: ${error.message}`);
    fs.copyFileSync(inputMp4Path, outputPath);
    return {
      audioTrackPlan: audioTrackPlan
        ? mergeTrackWarnings(
            {
              ...cloneTrackPlan(audioTrackPlan),
              qa: {
                ...(audioTrackPlan.qa ?? {}),
                hasAudioStream: false,
                segmentCount: audioTrackPlan.qa?.segmentCount ?? audioTrackPlan.segments?.length ?? 0,
                validSegmentCount: audioTrackPlan.qa?.validSegmentCount ?? audioTrackPlan.segments?.length ?? 0,
                warnings: [...(audioTrackPlan.qa?.warnings ?? []), ...warnings]
              },
              ...(audioTrackPlan.speechMode === 'real_speech' ? {status: 'unavailable'} : {})
            },
            [...(audioTrackPlan.warnings ?? []), ...warnings]
          )
        : undefined,
      hasAudioStream: false,
      outputPath,
      warnings
    };
  }

  if (!hasAudioStream({filePath: outputPath, runCommand})) {
    pushWarning(warnings, 'voiced mp4 missing audio stream after mux, generated silent fallback video.');
    fs.copyFileSync(inputMp4Path, outputPath);
    return {
      audioTrackPlan: audioTrackPlan
        ? mergeTrackWarnings(
            {
              ...cloneTrackPlan(audioTrackPlan),
              qa: {
                ...(audioTrackPlan.qa ?? {}),
                hasAudioStream: false,
                segmentCount: audioTrackPlan.qa?.segmentCount ?? audioTrackPlan.segments?.length ?? 0,
                validSegmentCount: audioTrackPlan.qa?.validSegmentCount ?? audioTrackPlan.segments?.length ?? 0,
                warnings: [...(audioTrackPlan.qa?.warnings ?? []), ...warnings]
              },
              ...(audioTrackPlan.speechMode === 'real_speech' ? {status: 'unavailable'} : {})
            },
            [...(audioTrackPlan.warnings ?? []), ...warnings]
          )
        : undefined,
      hasAudioStream: false,
      outputPath,
      warnings
    };
  }

  return {
    audioDurationSec: audioValidation.durationSec,
    audioTrackPlan: audioTrackPlan
      ? mergeTrackWarnings(
          {
            ...cloneTrackPlan(audioTrackPlan),
            qa: {
              ...(audioTrackPlan.qa ?? {}),
              hasAudioStream: true,
              segmentCount: audioTrackPlan.qa?.segmentCount ?? audioTrackPlan.segments?.length ?? 0,
              validSegmentCount: audioTrackPlan.qa?.validSegmentCount ?? audioTrackPlan.segments?.length ?? 0,
              warnings: [...(audioTrackPlan.qa?.warnings ?? []), ...warnings]
            }
          },
          [...(audioTrackPlan.warnings ?? []), ...warnings]
        )
      : undefined,
    hasAudioStream: true,
    outputPath,
    warnings
  };
};

module.exports = {
  ensureMixedAudioTrack,
  finalizeVideoAudio,
  getMediaDurationSec,
  hasAudioStream,
  validateAudioFile
};
