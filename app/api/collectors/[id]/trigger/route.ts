import { NextRequest } from "next/server";
import { executeCollectorRun, PipelineStage } from "@/lib/orchestrator/pipeline";
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
 * Executes the complete Layer 2 orchestration cycle with real-time SSE streaming updates:
 * Triggering -> Scraping -> Validating -> Checking Drift -> (Healing) -> Done
 */
export async function POST(req: NextRequest, context: RouteContext) {
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed by client
        }
      };

      try {
        sendEvent("stage", {
          stage: "triggering",
          message: "Dispatching scraper request to Bright Data...",
          timestamp: Date.now(),
        });

        const pipelineResult = await executeCollectorRun(
          id,
          {
            simulateDrift,
            customTargetUrl,
          },
          async (stage: PipelineStage, message: string, extra?: any) => {
            sendEvent("stage", {
              stage,
              message,
              extra,
              timestamp: Date.now(),
            });
          }
        );

        sendEvent("result", {
          success: true,
          result: pipelineResult,
          timestamp: Date.now(),
        });
      } catch (error: any) {
        console.error("[API /api/collectors/[id]/trigger POST] Failure:", error);
        sendEvent("error", {
          error: error.message || "Pipeline execution failed",
          timestamp: Date.now(),
        });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
