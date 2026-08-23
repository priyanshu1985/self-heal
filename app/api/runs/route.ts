import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * GET /api/runs
 * Query historical scraper executions, with optional collector filtering and pagination limit.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collectorId = searchParams.get("collectorId");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      100
    );

    const where = collectorId ? { collectorId } : {};

    const runs = await db.run.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        collector: {
          select: {
            id: true,
            name: true,
            collectorId: true,
          },
        },
        driftEvents: true,
      },
    });

    return apiSuccess({ runs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch runs";
    console.error("[API /api/runs GET] Failure:", error);
    return apiError(message, 500);
  }
}
