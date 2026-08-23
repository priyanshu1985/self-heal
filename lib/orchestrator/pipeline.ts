import { db } from "@/lib/db";
import { brightData } from "@/lib/brightdata/client";
import { validateScrapedData } from "@/lib/orchestrator/validator";
import { analyzeDrift } from "@/lib/orchestrator/drift-detector";
import { triggerHealFlow } from "@/lib/orchestrator/heal-trigger";
import { CollectorModel, CollectorSchemaDefinition } from "@/types";

export interface PipelineExecutionOptions {
  simulateDrift?: boolean;
  isHealedVerification?: boolean;
}

/**
 * Executes the full Layer 2 scraping, validation, and healing orchestration pipeline.
 */
export async function executeCollectorRun(
  collectorId: string,
  options?: PipelineExecutionOptions
) {
  const startTime = Date.now();

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

  // 2. Trigger collector run via Layer 1
  const triggerRes = await brightData.triggerCollector(
    collector.collectorId,
    collector.targetUrl,
    options
  );

  // 3. Fetch snapshot raw JSON results
  const snapshotRes = await brightData.getSnapshotResult(
    triggerRes.snapshotId,
    collector.collectorId,
    options
  );

  const durationMs = Date.now() - startTime;

  // 4. Run dynamic schema validation (Zod)
  const validationResult = validateScrapedData(snapshotRes.data, schemaDef);

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
    const driftEvents = await triggerHealFlow(collector, run.id, driftSummary);

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
