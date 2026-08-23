import { z } from "zod";

// --- Enums & Status Constants ---
export type CollectorStatus =
  | "healthy"
  | "drifted"
  | "healing"
  | "pending_approval"
  | "resolved";

export type RunStatus = "healthy" | "drifted" | "failed";

export type DriftStatus =
  | "detected"
  | "healing"
  | "pending_approval"
  | "resolved"
  | "rejected";

export type FieldType = "string" | "number" | "boolean" | "array" | "object";

// --- Schema Definitions ---
export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  example?: unknown;
}

export interface CollectorSchemaDefinition {
  fields: FieldDefinition[];
}

export const FieldDefinitionZodSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  required: z.boolean(),
  description: z.string().optional(),
  example: z.unknown().optional(),
});

export const CollectorSchemaZod = z.object({
  fields: z.array(FieldDefinitionZodSchema).min(1),
});

// --- Domain Models ---
export interface CollectorModel {
  id: string;
  name: string;
  collectorId: string;
  targetUrl: string;
  fieldSchema: string; // JSON string of CollectorSchemaDefinition
  currentTemplate: string | null;
  status: CollectorStatus;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  runs?: RunModel[];
  driftEvents?: DriftEventModel[];
}

export interface RunModel {
  id: string;
  collectorId: string;
  status: RunStatus;
  snapshotId: string | null;
  rawData: string | null;
  validatedData: string | null;
  validationErrors: string | null;
  durationMs: number | null;
  createdAt: Date;
  collector?: CollectorModel;
  driftEvents?: DriftEventModel[];
}

export interface DriftEventModel {
  id: string;
  collectorId: string;
  runId: string | null;
  fieldName: string;
  expectedType: string;
  receivedValue: string | null;
  errorMessage: string;
  status: DriftStatus;
  proposedDiff: string | null;
  proposedTemplate: string | null;
  healPrompt: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  collector?: CollectorModel;
  run?: RunModel | null;
}

// --- Validation Issue Representation ---
export interface ValidationIssue {
  fieldName: string;
  expectedType: string;
  receivedValue: unknown;
  message: string;
  path: (string | number)[];
}

export interface ValidationResult {
  isValid: boolean;
  validatedData: Record<string, unknown>[] | Record<string, unknown> | null;
  issues: ValidationIssue[];
}

// --- Bright Data API Types ---
export interface TriggerCollectorResponse {
  snapshotId: string;
  status: "queued" | "running" | "ready";
}

export interface SnapshotResultResponse {
  snapshotId: string;
  status: "ready" | "running" | "failed";
  data: Record<string, unknown>[] | Record<string, unknown>;
}

export interface RefactorTemplateResponse {
  collectorId: string;
  originalTemplate: string;
  proposedTemplate: string;
  diff: string;
  explanation?: string;
}
