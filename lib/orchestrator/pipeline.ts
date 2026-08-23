import { db } from "@/lib/db";
import { brightData } from "@/lib/brightdata/client";
import { validateScrapedData } from "@/lib/orchestrator/validator";
import { analyzeDrift } from "@/lib/orchestrator/drift-detector";
import { triggerHealFlow } from "@/lib/orchestrator/heal-trigger";
import { CollectorModel, CollectorSchemaDefinition } from "@/types";

export interface PipelineExecutionOptions {
  simulateDrift?: boolean;
  isHealedVerification?: boolean;
  customTargetUrl?: string;
}

export type PipelineStage =
  | "triggering"
  | "scraping"
  | "validating"
  | "checking_drift"
  | "healing"
  | "done";

export type ProgressCallback = (
  stage: PipelineStage,
  message: string,
  data?: any
) => Promise<void> | void;

/**
 * Executes the full Layer 2 scraping, validation, and healing orchestration pipeline.
 */
export async function executeCollectorRun(
  collectorId: string,
  options?: PipelineExecutionOptions,
  onProgress?: ProgressCallback
) {
  const startTime = Date.now();
  await onProgress?.("triggering", "Fetching collector and dispatching trigger to Bright Data...");

  // 1. Fetch collector from database
  const collectorRecord = await db.collector.findUnique({
    where: { id: collectorId },
  });

  if (!collectorRecord) {
    throw new Error(`Collector ${collectorId} not found`);
  }

  const collector = collectorRecord as unknown as CollectorModel;
  const schemaDef = JSON.parse(
    collector.fieldSchema
  ) as CollectorSchemaDefinition;

  const urlToScrape = options?.customTargetUrl || collector.targetUrl;

  // 2. Trigger collector run via Layer 1
  const triggerRes = await brightData.triggerCollector(
    collector.collectorId,
    urlToScrape,
    options
  );

  await onProgress?.("scraping", `Trigger dispatched (${triggerRes.snapshotId}). Fetching live snapshot data...`, {
    snapshotId: triggerRes.snapshotId,
  });

  // 3. Fetch snapshot raw JSON results
  const snapshotRes = await brightData.getSnapshotResult(
    triggerRes.snapshotId,
    collector.collectorId,
    options
  );

  const durationMs = Date.now() - startTime;

  await onProgress?.("validating", "Executing Zod runtime schema contract validation...", {
    recordCount: Array.isArray(snapshotRes.data) ? snapshotRes.data.length : 1,
  });

  // 4. Run dynamic schema validation (Zod)
  const validationResult = validateScrapedData(snapshotRes.data, schemaDef);

  await onProgress?.("checking_drift", "Evaluating schema compliance and field anomaly metrics...", {
    isValid: validationResult.isValid,
    errorCount: validationResult.issues.length,
  });

  if (validationResult.isValid) {
    // 5A. Scrape is HEALTHY
    const run = await db.run.create({
      data: {
        collectorId: collector.id,
        status: "healthy",
        snapshotId: snapshotRes.snapshotId,
        rawData: JSON.stringify(snapshotRes.data),
        validatedData: JSON.stringify(validationResult.validatedData),
        validationErrors: null,
        durationMs,
      },
    });

    await db.collector.update({
      where: { id: collector.id },
      data: {
        status: "healthy",
        lastRunAt: new Date(),
      },
    });

    await onProgress?.("done", "Run validated healthy! 0 schema issues detected.", {
      status: "healthy",
      runId: run.id,
    });

    return {
      success: true,
      status: "healthy",
      run,
      validation: validationResult,
    };
  } else {
    // 5B. Scrape has DRIFTED / FAILED validation
    const run = await db.run.create({
      data: {
        collectorId: collector.id,
        status: "drifted",
        snapshotId: snapshotRes.snapshotId,
        rawData: JSON.stringify(snapshotRes.data),
        validatedData: null,
        validationErrors: JSON.stringify(validationResult.issues),
        durationMs,
      },
    });

    await db.collector.update({
      where: { id: collector.id },
      data: {
        status: "drifted",
        lastRunAt: new Date(),
      },
    });

    // 6. Analyze drift & trigger AI heal flow
    const driftSummary = analyzeDrift(validationResult, schemaDef);

    await onProgress?.("healing", `Drift detected on field '${driftSummary.driftedFields.join(", ")}'. Initiating Bright Data AI Flow self-healing...`, {
      driftSummary,
    });

    const driftEvents = await triggerHealFlow(collector, run.id, driftSummary);

    await onProgress?.("done", "AI self-healing proposal generated and queued for review.", {
      status: "drifted",
      runId: run.id,
      driftEvents,
    });

    return {
      success: false,
      status: "drifted",
      run,
      validation: validationResult,
      driftSummary,
      driftEvents,
    };
  }
}
