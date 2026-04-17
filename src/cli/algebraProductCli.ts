declare const process: {
  argv: string[];
  exitCode?: number;
  stderr: {
    write: (chunk: string) => boolean;
  };
  stdout: {
    write: (chunk: string) => boolean;
  };
};

import {
  buildAlgebraProductEntry,
  isAlgebraPresentationMode,
  isTeachingPersonaId,
  isVideoHookStyle,
  type AlgebraPresentationMode,
  type TeachingPersonaId,
  type VideoHookStyle
} from '../engine';

type ParsedArgs = {
  ai: boolean;
  equation?: string;
  fallbackOnUnsupported: boolean;
  hookStyle?: VideoHookStyle;
  includeLesson: boolean;
  presentationMode: AlgebraPresentationMode;
  returnReport: boolean;
  teachingPersona?: TeachingPersonaId;
};

const writeStdout = (value: string) => {
  process.stdout.write(value);
};

const writeStderr = (value: string) => {
  process.stderr.write(value);
};

const printUsage = () => {
  writeStderr(
    [
      'Usage:',
      '  npm run product -- "2x+3=7"',
      '  npm run product -- --equation "x+y=5, x-y=1" --ai',
      '',
      'Flags:',
      '  --equation <value>       Input equation string',
      '  --ai                     Run AI enhancement orchestration',
      '  --no-fallback            Return unsupported instead of fallback problem',
      '  --no-lesson              Skip render-ready lesson output',
      '  --no-report              Skip report field in the returned object',
      '  --hook-style <value>      mistake_first, question_first, shortcut_first',
      '  --persona <value>         calm_teacher, strict_teacher, exam_coach',
      '  --presentation-mode <value>  auto, answer_only, compact_steps, full_steps, semantic_full_steps'
    ].join('\n') + '\n'
  );
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const parsed: ParsedArgs = {
    ai: false,
    fallbackOnUnsupported: true,
    includeLesson: true,
    presentationMode: 'auto',
    returnReport: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === '--ai') {
      parsed.ai = true;
      continue;
    }

    if (arg === '--no-fallback') {
      parsed.fallbackOnUnsupported = false;
      continue;
    }

    if (arg === '--no-lesson') {
      parsed.includeLesson = false;
      continue;
    }

    if (arg === '--no-report') {
      parsed.returnReport = false;
      continue;
    }

    if (arg === '--equation') {
      parsed.equation = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--hook-style' || arg === '--hookStyle') {
      const hookStyle = argv[index + 1];

      if (isVideoHookStyle(hookStyle)) {
        parsed.hookStyle = hookStyle;
      }

      index += 1;
      continue;
    }

    if (arg === '--presentation-mode' || arg === '--presentationMode') {
      const presentationMode = argv[index + 1];

      if (isAlgebraPresentationMode(presentationMode)) {
        parsed.presentationMode = presentationMode;
      }

      index += 1;
      continue;
    }

    if (arg === '--persona' || arg === '--teaching-persona' || arg === '--teachingPersona') {
      const teachingPersona = argv[index + 1];

      if (isTeachingPersonaId(teachingPersona)) {
        parsed.teachingPersona = teachingPersona;
      }

      index += 1;
      continue;
    }

    if (!arg.startsWith('--') && !parsed.equation) {
      parsed.equation = arg;
    }
  }

  return parsed;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.equation?.trim()) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const result = await buildAlgebraProductEntry(args.equation, {
    ai: args.ai,
    fallbackOnUnsupported: args.fallbackOnUnsupported,
    hookStyle: args.hookStyle,
    includeLesson: args.includeLesson,
    presentationMode: args.presentationMode,
    returnReport: args.returnReport,
    teachingPersona: args.teachingPersona
  });

  writeStdout(`${JSON.stringify(result, null, 2)}\n`);
};

void main();
