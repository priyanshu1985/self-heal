import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/collectors/[id]
 * Retrieves single collector details along with full run and drift history.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const collector = await db.collector.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        driftEvents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collector) {
      return apiError(`Collector with ID '${id}' was not found.`, 404);
    }

    return apiSuccess({ collector });
  } catch (error: any) {
    console.error("[API /api/collectors/[id] GET] Failure:", error);
    return apiError(error.message || "Failed to fetch collector", 500);
  }
}

/**
 * DELETE /api/collectors/[id]
 * Cascading deletion of collector, associated runs, and drift events.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await db.collector.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError(`Collector with ID '${id}' was not found.`, 404);
    }

    await db.collector.delete({
      where: { id },
    });

    return apiSuccess({
      message: `Collector '${existing.name}' (${id}) was deleted successfully.`,
    });
  } catch (error: any) {
    console.error("[API /api/collectors/[id] DELETE] Failure:", error);
    return apiError(error.message || "Failed to delete collector", 500);
  }
}
