import {
  RefactorTemplateResponse,
  SnapshotResultResponse,
  TriggerCollectorResponse,
} from "@/types";

const BRIGHT_DATA_BASE_URL = "https://api.brightdata.com";

export class BrightDataClient {
  private explicitApiKey?: string;
  private explicitMock?: boolean;

  constructor(apiKey?: string, isMock?: boolean) {
    this.explicitApiKey = apiKey;
    this.explicitMock = isMock;
  }

  private get apiKey(): string {
    return this.explicitApiKey || process.env.BRIGHT_DATA_API_KEY || "";
  }

  private get isMock(): boolean {
    if (this.explicitMock !== undefined) return this.explicitMock;
    if (process.env.BRIGHT_DATA_MOCK === "true") return true;
    return !this.apiKey;
  }

  /**
   * Safe status check that does not leak the secret key
   */
  getCredentialsStatus() {
    const key = this.apiKey;
    return {
      hasApiKey: Boolean(key),
      maskedKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : "NOT_CONFIGURED",
      isMockMode: this.isMock,
    };
  }

  /**
   * Triggers a collector run via Bright Data Collection API (/dca/trigger).
   */
  async triggerCollector(
    collectorId: string,
    targetUrl: string,
    options?: { simulateDrift?: boolean }
  ): Promise<TriggerCollectorResponse> {
    if (this.isMock) {
      const mockSnapshotId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      return {
        snapshotId: mockSnapshotId,
        status: "ready",
      };
    }

    try {
      const response = await fetch(
        `${BRIGHT_DATA_BASE_URL}/dca/trigger?collector=${encodeURIComponent(collectorId)}&queue_next=1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{ url: targetUrl }]),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bright Data trigger failed (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      return {
        snapshotId: data.response_id || data.snapshot_id || `s_${Date.now()}`,
        status: "ready",
      };
    } catch (error) {
      console.error("[BrightDataClient] Error triggering collector:", error);
      throw error;
    }
  }

  /**
   * Retrieves snapshot data for a given snapshot ID.
   */
  async getSnapshotResult(
    snapshotId: string,
    collectorId: string,
    options?: { simulateDrift?: boolean; isHealed?: boolean }
  ): Promise<SnapshotResultResponse> {
    if (this.isMock) {
      // Return simulated scraped data
      if (options?.simulateDrift) {
        // Drifted mock data: price is null or string with missing currency, rating missing
        return {
          snapshotId,
          status: "ready",
          data: [
            {
              id: "prod_101",
              title: "Wireless Noise-Canceling Headphones",
              price: null, // DRIFT: Expected number, got null
              rating: "4.8 out of 5", // DRIFT: Expected number, got string
              inStock: true,
              sku: "TECH-HD-001",
            },
            {
              id: "prod_102",
              title: "Mechanical RGB Gaming Keyboard",
              price: null, // DRIFT: Expected number, got null
              rating: null, // DRIFT: Expected number, got null
              inStock: false,
              sku: "TECH-KB-002",
            },
          ],
        };
      }

      // Healthy valid data
      return {
        snapshotId,
        status: "ready",
        data: [
          {
            id: "prod_101",
            title: "Wireless Noise-Canceling Headphones",
            price: 199.99,
            rating: 4.8,
            inStock: true,
            sku: "TECH-HD-001",
          },
          {
            id: "prod_102",
            title: "Mechanical RGB Gaming Keyboard",
            price: 129.5,
            rating: 4.6,
            inStock: true,
            sku: "TECH-KB-002",
          },
          {
            id: "prod_103",
            title: "Ultra-Wide 34-Inch Curved Monitor",
            price: 499.0,
            rating: 4.9,
            inStock: true,
            sku: "TECH-MN-003",
          },
        ],
      };
    }

    try {
      const response = await fetch(
        `${BRIGHT_DATA_BASE_URL}/dca/get_result?response_id=${encodeURIComponent(snapshotId)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bright Data get_result failed (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      return {
        snapshotId,
        status: "ready",
        data,
      };
    } catch (error) {
      console.error("[BrightDataClient] Error fetching snapshot result:", error);
      throw error;
    }
  }

  /**
   * Triggers Bright Data Scraper Studio AI Flow to refactor/heal the collector template.
   * Endpoint: /dca/collectors/{id}/refactor_template
   */
  async refactorTemplate(
    collectorId: string,
    currentTemplate: string | null,
    healPrompt: string
  ): Promise<RefactorTemplateResponse> {
    if (this.isMock) {
      const oldCode =
        currentTemplate ||
        `// Original Extractor Template
function extract(page) {
  return {
    title: page.query('.product-title')?.text?.trim(),
    price: parseFloat(page.query('.price-tag-v1')?.text?.replace('$', '')),
    rating: parseFloat(page.query('.star-rating-v1')?.attr('data-score')),
    inStock: Boolean(page.query('.in-stock-badge')),
    sku: page.query('.sku-code')?.text?.trim()
  };
}`;

      const proposedCode = `// AI-Healed Extractor Template (Refactored for DOM updates)
function extract(page) {
  // AI Fix: Target site migrated .price-tag-v1 to .product-pricing-card__amount
  // and changed star-rating to composite numeric badge
  const priceElem = page.query('.product-pricing-card__amount') || page.query('[data-testid="product-price"]');
  const priceRaw = priceElem?.text?.replace(/[^0-9.]/g, '');
  
  const ratingElem = page.query('.product-review-score') || page.query('[data-rating-value]');
  const ratingRaw = ratingElem?.attr('data-rating-value') || ratingElem?.text?.match(/([0-9.]+)/)?.[1];

  return {
    title: page.query('.product-title, h1.product-name')?.text?.trim(),
    price: priceRaw ? parseFloat(priceRaw) : null,
    rating: ratingRaw ? parseFloat(ratingRaw) : null,
    inStock: Boolean(page.query('.in-stock-badge, .inventory-status--available')),
    sku: (page.query('.sku-code') || page.query('[data-product-sku]'))?.text?.trim()
  };
}`;

      const diff = `--- a/collectors/${collectorId}/template.js
+++ b/collectors/${collectorId}/template.js
@@ -3,4 +3,9 @@
-    price: parseFloat(page.query('.price-tag-v1')?.text?.replace('$', '')),
-    rating: parseFloat(page.query('.star-rating-v1')?.attr('data-score')),
+    // AI Fix: Handled updated class names & regex number sanitization
+    const priceElem = page.query('.product-pricing-card__amount') || page.query('[data-testid="product-price"]');
+    const priceRaw = priceElem?.text?.replace(/[^0-9.]/g, '');
+    const ratingElem = page.query('.product-review-score') || page.query('[data-rating-value]');
+    const ratingRaw = ratingElem?.attr('data-rating-value') || ratingElem?.text?.match(/([0-9.]+)/)?.[1];
+    price: priceRaw ? parseFloat(priceRaw) : null,
+    rating: ratingRaw ? parseFloat(ratingRaw) : null,`;

      return {
        collectorId,
        originalTemplate: oldCode,
        proposedTemplate: proposedCode,
        diff,
        explanation:
          "AI Flow updated extraction selectors for 'price' and 'rating' following DOM structure changes on the target page.",
      };
    }

    try {
      const response = await fetch(
        `${BRIGHT_DATA_BASE_URL}/dca/collectors/${encodeURIComponent(collectorId)}/refactor_template`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: healPrompt,
            current_template: currentTemplate,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AI Flow refactor_template failed (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      return {
        collectorId,
        originalTemplate: currentTemplate || "",
        proposedTemplate: data.proposed_template || data.template,
        diff: data.diff || "Diff unavailable from API",
        explanation: data.explanation,
      };
    } catch (error) {
      console.error("[BrightDataClient] Error refactoring template:", error);
      throw error;
    }
  }
}

export const brightData = new BrightDataClient();
