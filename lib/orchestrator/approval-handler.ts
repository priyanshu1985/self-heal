import { db } from "@/lib/db";
import { executeCollectorRun } from "@/lib/orchestrator/pipeline";

/**
 * Handles human approval of an AI-proposed template diff.
 * Applies the new template, re-runs the collector, re-validates, and marks the event resolved.
 */
export async function approveDiff(driftEventId: string) {
  const driftEvent = await db.driftEvent.findUnique({
    where: { id: driftEventId },
    include: { collector: true },
  });

  if (!driftEvent) {
    throw new Error(`Drift event with ID ${driftEventId} not found.`);
  }

  if (driftEvent.status === "resolved") {
    return { message: "Drift event already resolved", driftEvent };
  }

  // 1. Update the collector's current template if a proposed template exists
  if (driftEvent.proposedTemplate) {
    await db.collector.update({
      where: { id: driftEvent.collectorId },
      data: {
        currentTemplate: driftEvent.proposedTemplate,
      },
    });
  }

  // 2. Mark the drift event as resolved
  const updatedEvent = await db.driftEvent.update({
    where: { id: driftEventId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
    },
  });

  // 3. Re-run the collector with the healed template to verify extraction
  const rerunResult = await executeCollectorRun(driftEvent.collectorId, {
    isHealedVerification: true,
  });

  // 4. Update collector status based on re-run
  await db.collector.update({
    where: { id: driftEvent.collectorId },
    data: {
      status: rerunResult.run.status === "healthy" ? "healthy" : "drifted",
    },
  });

  return {
    success: true,
    driftEvent: updatedEvent,
    rerun: rerunResult,
  };
}

/**
 * Handles human rejection of an AI-proposed template diff.
 */
export async function rejectDiff(driftEventId: string, reason?: string) {
  const updatedEvent = await db.driftEvent.update({
    where: { id: driftEventId },
    data: {
      status: "rejected",
      errorMessage: reason ? `Rejected by user: ${reason}` : "Rejected by user",
    },
  });

  return {
    success: true,
    driftEvent: updatedEvent,
  };
}
