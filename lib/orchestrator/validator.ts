import { z, ZodTypeAny } from "zod";
import {
  CollectorSchemaDefinition,
  FieldDefinition,
  ValidationIssue,
  ValidationResult,
} from "@/types";

/**
 * Builds a dynamic Zod schema object from field definitions.
 */
export function buildDynamicZodSchema(fieldDefinitions: FieldDefinition[]): z.ZodObject<any> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fieldDefinitions) {
    let fieldSchema: ZodTypeAny;

    switch (field.type) {
      case "string":
        fieldSchema = z.string();
        break;
      case "number":
        fieldSchema = z.number();
        break;
      case "boolean":
        fieldSchema = z.boolean();
        break;
      case "array":
        fieldSchema = z.array(z.any());
        break;
      case "object":
        fieldSchema = z.record(z.any());
        break;
      default:
        fieldSchema = z.any();
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    shape[field.name] = fieldSchema;
  }

  return z.object(shape);
}

/**
 * Validates raw scraper result data against expected schema definition.
 * Supports both an array of scraped items or a single scraped object.
 */
export function validateScrapedData(
  rawJsonData: unknown,
  schemaDefinition: CollectorSchemaDefinition
): ValidationResult {
  const itemSchema = buildDynamicZodSchema(schemaDefinition.fields);
  const issues: ValidationIssue[] = [];

  if (rawJsonData === null || rawJsonData === undefined) {
    return {
      isValid: false,
      validatedData: null,
      issues: [
        {
          fieldName: "root",
          expectedType: "object | array",
          receivedValue: rawJsonData,
          message: "Scraper returned empty or null response.",
          path: [],
        },
      ],
    };
  }

  // If scraped data is an array of items
  if (Array.isArray(rawJsonData)) {
    if (rawJsonData.length === 0) {
      return {
        isValid: false,
        validatedData: [],
        issues: [
          {
            fieldName: "root",
            expectedType: "non-empty array",
            receivedValue: [],
            message: "Scraper returned an empty array of records.",
            path: [],
          },
        ],
      };
    }

    const validatedItems: Record<string, unknown>[] = [];

    rawJsonData.forEach((item, index) => {
      const parseResult = itemSchema.safeParse(item);
      if (parseResult.success) {
        validatedItems.push(parseResult.data);
      } else {
        for (const error of parseResult.error.issues) {
          const fieldName = (error.path[0] as string) || "unknown";
          const rawValue = (item as Record<string, unknown>)?.[fieldName];

          issues.push({
            fieldName,
            expectedType: schemaDefinition.fields.find((f) => f.name === fieldName)?.type || "unknown",
            receivedValue: rawValue === undefined ? "MISSING (undefined)" : rawValue,
            message: `[Item #${index + 1}] Field '${fieldName}' failed validation: ${error.message}`,
            path: [index, ...error.path],
          });
        }
      }
    });

    return {
      isValid: issues.length === 0,
      validatedData: issues.length === 0 ? validatedItems : null,
      issues,
    };
  }

  // If scraped data is a single item object
  const singleParse = itemSchema.safeParse(rawJsonData);
  if (singleParse.success) {
    return {
      isValid: true,
      validatedData: singleParse.data,
      issues: [],
    };
  } else {
    for (const error of singleParse.error.issues) {
      const fieldName = (error.path[0] as string) || "unknown";
      const rawValue = (rawJsonData as Record<string, unknown>)?.[fieldName];

      issues.push({
        fieldName,
        expectedType: schemaDefinition.fields.find((f) => f.name === fieldName)?.type || "unknown",
        receivedValue: rawValue === undefined ? "MISSING (undefined)" : rawValue,
        message: `Field '${fieldName}' validation error: ${error.message}`,
        path: error.path,
      });
    }

    return {
      isValid: false,
      validatedData: null,
      issues,
    };
  }
}
