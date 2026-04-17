declare const process: {
  exitCode?: number;
};

import {
  buildAlgebraProductEntry,
  getAlgebraOfficialContentPack,
  type AlgebraContentExample,
  type AlgebraContentPackSection,
  type AlgebraDemoQaExpectation
} from '../integration';

type DemoQaFailure = {
  exampleId: string;
  issues: string[];
  label: string;
};

type DemoQaSectionStats = {
  failures: DemoQaFailure[];
  passed: number;
  total: number;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const collectExampleIssues = async (
  example: AlgebraContentExample,
  qa: AlgebraDemoQaExpectation
) => {
  const result = await buildAlgebraProductEntry(example.equation, {
    fallbackOnUnsupported: true,
    includeLesson: false,
    presentationMode: example.recommendedPresentationMode ?? 'auto',
    returnReport: false
  });
  const issues: string[] = [];
  const actualStepCount = result.problem?.steps.length ?? 0;

  if (result.family.id !== qa.expectedFamily) {
    issues.push(`family mismatch: expected ${qa.expectedFamily}, got ${result.family.id}`);
  }

  if (result.supported !== qa.expectedSupported) {
    issues.push(`supported mismatch: expected ${qa.expectedSupported}, got ${result.supported}`);
  }

  if (result.render.renderable !== qa.expectedRenderable) {
    issues.push(`renderable mismatch: expected ${qa.expectedRenderable}, got ${result.render.renderable}`);
  }

  if (
    actualStepCount < qa.stepCountRange.min ||
    actualStepCount > qa.stepCountRange.max
  ) {
    issues.push(
      `step count out of range: expected ${qa.stepCountRange.min}-${qa.stepCountRange.max}, got ${actualStepCount}`
    );
  }

  if (qa.recommendedPresentationModeAvailable) {
    if (!example.recommendedPresentationMode) {
      issues.push('recommendedPresentationMode missing.');
    } else {
      if (result.presentationStrategy.id !== example.recommendedPresentationMode) {
        issues.push(
          `recommendedPresentationMode unavailable: expected ${example.recommendedPresentationMode}, got ${result.presentationStrategy.id}`
        );
      }

      if (result.presentationSource !== 'override') {
        issues.push(`presentationSource mismatch: expected override, got ${result.presentationSource}`);
      }
    }
  }

  return {
    issues,
    result
  };
};

const runSectionQa = async (section: AlgebraContentPackSection): Promise<DemoQaSectionStats> => {
  const failures: DemoQaFailure[] = [];
  let passed = 0;

  for (const example of section.examples) {
    if (!example.qa) {
      failures.push({
        exampleId: example.id,
        issues: ['missing qa expectation on content example'],
        label: example.label
      });
      continue;
    }

    const {issues} = await collectExampleIssues(example, example.qa);

    if (issues.length === 0) {
      passed += 1;
      continue;
    }

    failures.push({
      exampleId: example.id,
      issues,
      label: example.label
    });
  }

  return {
    failures,
    passed,
    total: section.examples.length
  };
};

const main = async () => {
  const contentPack = getAlgebraOfficialContentPack();
  const sectionStats = new Map<string, DemoQaSectionStats>();
  let totalPassed = 0;
  let totalExamples = 0;

  for (const section of contentPack.categories) {
    const stats = await runSectionQa(section);
    sectionStats.set(section.id, stats);
    totalPassed += stats.passed;
    totalExamples += stats.total;

    console.log(
      `[demo-qa] ${section.id}: ${stats.passed}/${stats.total} passed (${formatPercent(
        stats.total === 0 ? 1 : stats.passed / stats.total
      )})`
    );
  }

  console.log(
    `[demo-qa] total: ${totalPassed}/${totalExamples} passed (${formatPercent(
      totalExamples === 0 ? 1 : totalPassed / totalExamples
    )})`
  );

  for (const [sectionId, stats] of sectionStats.entries()) {
    for (const failure of stats.failures) {
      console.log(`[demo-qa] FAIL ${sectionId} ${failure.exampleId} (${failure.label})`);
      failure.issues.forEach((issue) => {
        console.log(`  - ${issue}`);
      });
    }
  }

  if (Array.from(sectionStats.values()).some((stats) => stats.failures.length > 0)) {
    process.exitCode = 1;
    return;
  }

  console.log('[demo-qa] all official content pack examples passed.');
};

void main();
