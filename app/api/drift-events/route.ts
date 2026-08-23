import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * GET /api/drift-events
 * Fetch all drift events and self-healing proposals for audit logs and timeline views.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collectorId = searchParams.get("collectorId");
    const status = searchParams.get("status");

    const where: any = {};
    if (collectorId) where.collectorId = collectorId;
    if (status) where.status = status;

    const driftEvents = await db.driftEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        collector: {
          select: {
            id: true,
            name: true,
            collectorId: true,
            targetUrl: true,
          },
        },
        run: {
          select: {
            id: true,
            status: true,
            durationMs: true,
            createdAt: true,
          },
        },
      },
    });

    return apiSuccess({ driftEvents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch drift events";
    console.error("[API /api/drift-events GET] Failure:", error);
    return apiError(message, 500);
  }
}
