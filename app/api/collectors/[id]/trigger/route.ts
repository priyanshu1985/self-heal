import { NextRequest } from "next/server";
import { executeCollectorRun } from "@/lib/orchestrator/pipeline";
import { apiError, apiSuccess } from "@/lib/api-response";
import { z } from "zod";

const TriggerOptionsSchema = z
  .object({
    simulateDrift: z.boolean().optional(),
    targetUrl: z.string().url().optional(),
  })
  .optional();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/collectors/[id]/trigger
 * Executes the complete Layer 2 orchestration cycle:
 * Scrape -> Schema Validation -> Drift Detection -> Automated AI Heal Trigger -> State Update
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body payload is optional
    }

    const parsedOptions = TriggerOptionsSchema.safeParse(body);
    const simulateDrift = parsedOptions.success
      ? parsedOptions.data?.simulateDrift
      : false;
    const customTargetUrl = parsedOptions.success
      ? parsedOptions.data?.targetUrl
      : undefined;

    const pipelineResult = await executeCollectorRun(id, {
      simulateDrift,
      customTargetUrl,
    });

    return apiSuccess({ result: pipelineResult });
  } catch (error: any) {
    console.error("[API /api/collectors/[id]/trigger POST] Failure:", error);
    return apiError(error.message || "Pipeline execution failed", 500);
  }
}
