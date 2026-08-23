import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Target Website API / HTML endpoint for reproducible Phase 3 break-and-heal testing.
 * ?broken=true returns DOM with changed classnames/structure to trigger drift.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isBroken = searchParams.get("broken") === "true";

  if (isBroken) {
    // Structural change: class 'price-tag-v1' is renamed to 'product-pricing-card__amount'
    // and star score moved to data attribute
    const brokenHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>TechShop Demo - V2 (Modified DOM)</title></head>
        <body>
          <div class="product-catalog-grid">
            <div class="product-item-v2" data-product-id="prod_101">
              <h2 class="product-name">Wireless Noise-Canceling Headphones</h2>
              <div class="product-pricing-card__amount">$199.99</div>
              <div class="product-review-score" data-rating-value="4.8">Rated 4.8 / 5</div>
              <span class="inventory-status--available">In Stock</span>
              <span class="product-sku" data-product-sku="TECH-HD-001">SKU: TECH-HD-001</span>
            </div>
          </div>
        </body>
      </html>
    `;
    return new NextResponse(brokenHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Original standard DOM
  const originalHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>TechShop Demo - V1 (Original DOM)</title></head>
      <body>
        <div class="product-grid">
          <div class="product-card" data-product-id="prod_101">
            <h2 class="product-title">Wireless Noise-Canceling Headphones</h2>
            <span class="price-tag-v1">$199.99</span>
            <div class="star-rating-v1" data-score="4.8">★★★★☆</div>
            <span class="in-stock-badge">In Stock</span>
            <span class="sku-code">TECH-HD-001</span>
          </div>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(originalHtml, {
    headers: { "Content-Type": "text/html" },
  });
}
