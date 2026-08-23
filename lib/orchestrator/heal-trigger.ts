import { db } from "@/lib/db";
import { brightData } from "@/lib/brightdata/client";
import { buildHealPrompt, DetectedDriftSummary } from "@/lib/orchestrator/drift-detector";
import { CollectorModel } from "@/types";

/**
 * Triggers the AI Flow heal process on Bright Data Scraper Studio
 * and records drift events in the database with status 'pending_approval'.
 */
export async function triggerHealFlow(
  collector: CollectorModel,
  runId: string,
  driftSummary: DetectedDriftSummary
) {
  if (!driftSummary.hasDrift || driftSummary.fieldPrompts.length === 0) {
    return [];
  }

  // Update collector status to 'healing'
  await db.collector.update({
    where: { id: collector.id },
    data: { status: "healing" },
  });

  const createdDriftEvents = [];

  for (const fieldPrompt of driftSummary.fieldPrompts) {
    const promptText = buildHealPrompt(
      fieldPrompt.fieldName,
      fieldPrompt.expectedType,
      fieldPrompt.description,
      collector.targetUrl,
      fieldPrompt.errorMessage
    );

    // Call AI Flow refactor_template
    const healResult = await brightData.refactorTemplate(
      collector.collectorId,
      collector.currentTemplate,
      promptText
    );

    // Persist drift event as pending approval
    const driftEvent = await db.driftEvent.create({
      data: {
        collectorId: collector.id,
        runId,
        fieldName: fieldPrompt.fieldName,
        expectedType: fieldPrompt.expectedType,
        receivedValue: null,
        errorMessage: fieldPrompt.errorMessage,
        status: "pending_approval",
        proposedDiff: healResult.diff,
        proposedTemplate: healResult.proposedTemplate,
        healPrompt: promptText,
      },
    });

    createdDriftEvents.push(driftEvent);
  }

  // Update collector status to 'pending_approval'
  await db.collector.update({
    where: { id: collector.id },
    data: { status: "pending_approval" },
  });

  return createdDriftEvents;
}
