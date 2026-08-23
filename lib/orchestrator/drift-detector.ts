import {
  CollectorSchemaDefinition,
  ValidationIssue,
  ValidationResult,
} from "@/types";

export interface DetectedDriftSummary {
  hasDrift: boolean;
  driftedFields: string[];
  issuesSummary: string;
  fieldPrompts: {
    fieldName: string;
    expectedType: string;
    description: string;
    errorMessage: string;
  }[];
}

/**
 * Analyzes validation result and produces actionable drift summaries and AI heal prompts.
 */
export function analyzeDrift(
  validationResult: ValidationResult,
  schemaDefinition: CollectorSchemaDefinition
): DetectedDriftSummary {
  if (validationResult.isValid || validationResult.issues.length === 0) {
    return {
      hasDrift: false,
      driftedFields: [],
      issuesSummary: "Schema validation passed with 0 issues.",
      fieldPrompts: [],
    };
  }

  const uniqueFields = Array.from(
    new Set(validationResult.issues.map((issue) => issue.fieldName))
  );

  const fieldPrompts = uniqueFields.map((fieldName) => {
    const fieldDef = schemaDefinition.fields.find((f) => f.name === fieldName);
    const relatedIssues = validationResult.issues.filter(
      (i) => i.fieldName === fieldName
    );
    const issueMessages = relatedIssues.map((i) => i.message).join("; ");

    return {
      fieldName,
      expectedType: fieldDef?.type || "string",
      description:
        fieldDef?.description ||
        `Extract the ${fieldName} field accurately according to the page layout.`,
      errorMessage: issueMessages,
    };
  });

  const issuesSummary = `Detected drift on ${uniqueFields.length} field(s): ${uniqueFields.join(
    ", "
  )}. Issues: ${validationResult.issues.map((i) => i.message).slice(0, 3).join(" | ")}`;

  return {
    hasDrift: true,
    driftedFields: uniqueFields,
    issuesSummary,
    fieldPrompts,
  };
}

/**
 * Formats a plain-language prompt for Bright Data's AI Flow heal endpoint.
 */
export function buildHealPrompt(
  fieldName: string,
  expectedType: string,
  fieldDescription: string,
  targetUrl: string,
  errorMessage: string
): string {
  return `Repair the extraction template for target URL: ${targetUrl}.
Field to fix: "${fieldName}" (Expected Type: ${expectedType}).
Field intent/description: "${fieldDescription}".
Current failure reason: ${errorMessage}.
Please update selector/parser code to reliably extract this field from the updated DOM structure.`;
}
