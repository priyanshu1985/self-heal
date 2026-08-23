import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CollectorSchemaZod } from "@/types";
import { apiError, apiSuccess } from "@/lib/api-response";
import { z } from "zod";

const CreateCollectorSchema = z.object({
  name: z.string().trim().min(1, "Collector name is required"),
  collectorId: z.string().trim().min(1, "Collector identifier is required"),
  targetUrl: z.string().trim().url("Target URL must be a valid HTTP(S) URL"),
  fieldSchema: z.record(z.any()),
  currentTemplate: z.string().optional(),
});

/**
 * GET /api/collectors
 * Returns all registered collectors with recent run history.
 */
export async function GET() {
  try {
    const collectors = await db.collector.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        runs: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        driftEvents: {
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return apiSuccess({ collectors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve collectors";
    console.error("[API /api/collectors GET] Failure:", error);
    return apiError(message, 500);
  }
}

/**
 * POST /api/collectors
 * Registers a new collector with a verified Zod schema definition.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateCollectorSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Invalid request payload",
        400,
        parsed.error.flatten().fieldErrors
      );
    }

    const { name, collectorId, targetUrl, fieldSchema, currentTemplate } =
      parsed.data;

    // Validate the internal field specification against CollectorSchemaZod
    const schemaValidation = CollectorSchemaZod.safeParse(fieldSchema);
    if (!schemaValidation.success) {
      return apiError(
        "Invalid fieldSchema structure: must contain a 'fields' array with valid field definitions",
        400,
        schemaValidation.error.issues
      );
    }

    // Ensure collectorId is unique
    const existing = await db.collector.findUnique({
      where: { collectorId },
    });

    if (existing) {
      return apiError(
        `A collector with ID '${collectorId}' already exists.`,
        409
      );
    }

    const newCollector = await db.collector.create({
      data: {
        name,
        collectorId,
        targetUrl,
        fieldSchema: JSON.stringify(fieldSchema),
        currentTemplate: currentTemplate || null,
        status: "healthy",
      },
    });

    return apiSuccess({ collector: newCollector }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create collector";
    console.error("[API /api/collectors POST] Failure:", error);
    return apiError(message, 500);
  }
}
