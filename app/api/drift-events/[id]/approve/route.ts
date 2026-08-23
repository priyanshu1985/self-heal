import { NextRequest } from "next/server";
import { approveDiff } from "@/lib/orchestrator/approval-handler";
import { apiError, apiSuccess } from "@/lib/api-response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/drift-events/[id]/approve
 * Human-in-the-loop approval gate.
 * Applies the AI-proposed diff, re-executes the collector, and marks the drift event resolved.
 */
export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await approveDiff(id);

    return apiSuccess({
      message: "AI-proposed fix approved and extraction re-verified successfully.",
      result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve diff";
    console.error("[API /api/drift-events/[id]/approve POST] Failure:", error);
    return apiError(message, 500);
  }
}
