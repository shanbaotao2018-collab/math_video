import type {
  BatchEpisodeExecutionOverrides,
  BatchEpisodeProductEntry,
  BatchEpisodeTemplateExecution,
  BatchEpisodeContentProgramming
} from './batchTypes';

export const resolveBatchEpisodeTemplateExecution = ({
  explicitOverrides,
  templateSnapshot
}: {
  explicitOverrides?: BatchEpisodeExecutionOverrides;
  templateSnapshot?: BatchEpisodeContentProgramming['templateSnapshot'];
}): BatchEpisodeTemplateExecution => {
  const buildOverrides: BatchEpisodeExecutionOverrides = {};
  const appliedOverrides: BatchEpisodeExecutionOverrides = {};

  if (explicitOverrides?.teachingPersona) {
    buildOverrides.teachingPersona = explicitOverrides.teachingPersona;
  } else if (templateSnapshot?.preferredPersona) {
    buildOverrides.teachingPersona = templateSnapshot.preferredPersona;
    appliedOverrides.teachingPersona = templateSnapshot.preferredPersona;
  }

  if (explicitOverrides?.hookStyle) {
    buildOverrides.hookStyle = explicitOverrides.hookStyle;
  } else if (templateSnapshot?.preferredHookStyle) {
    buildOverrides.hookStyle = templateSnapshot.preferredHookStyle;
    appliedOverrides.hookStyle = templateSnapshot.preferredHookStyle;
  }

  if (explicitOverrides?.presentationMode) {
    buildOverrides.presentationMode = explicitOverrides.presentationMode;
  } else if (templateSnapshot?.preferredPresentationMode) {
    buildOverrides.presentationMode = templateSnapshot.preferredPresentationMode;
    appliedOverrides.presentationMode = templateSnapshot.preferredPresentationMode;
  }

  return {
    ...(Object.keys(appliedOverrides).length > 0 ? {appliedOverrides} : {}),
    ...(templateSnapshot ? {appliedTemplateId: templateSnapshot.id} : {}),
    buildOverrides
  };
};

export const applyBatchTemplateExecutionMetadata = (
  productEntry: BatchEpisodeProductEntry,
  execution: BatchEpisodeTemplateExecution
): BatchEpisodeProductEntry => {
  return {
    ...productEntry,
    ...(execution.appliedTemplateId ? {appliedTemplateId: execution.appliedTemplateId} : {}),
    ...(execution.appliedOverrides ? {appliedOverrides: execution.appliedOverrides} : {})
  };
};
