import { NextRequest } from "next/server";
import { rejectDiff } from "@/lib/orchestrator/approval-handler";
import { apiError, apiSuccess } from "@/lib/api-response";
import { z } from "zod";

const RejectInputSchema = z
  .object({
    reason: z.string().trim().optional(),
  })
  .optional();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/drift-events/[id]/reject
 * Human-in-the-loop rejection action for an AI-proposed template refactor.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const parsed = RejectInputSchema.safeParse(body);
    const reason = parsed.success ? parsed.data?.reason : undefined;

    const result = await rejectDiff(id, reason);

    return apiSuccess({
      message: "Proposed AI diff was rejected by operator.",
      result,
    });
  } catch (error: any) {
    console.error("[API /api/drift-events/[id]/reject POST] Failure:", error);
    return apiError(error.message || "Failed to reject diff", 500);
  }
}
