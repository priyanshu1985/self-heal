import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SelfHeal database with initial collectors and baseline data...");

  // Clean existing records if any
  await prisma.driftEvent.deleteMany({});
  await prisma.run.deleteMany({});
  await prisma.collector.deleteMany({});

  // 1. Books to Scrape Bookstore Catalog Collector (Decided Target)
  const booksCollector = await prisma.collector.create({
    data: {
      name: "BooksToScrape Sandbox Bookstore Catalog",
      collectorId: "c_books_toscrape",
      targetUrl: "https://books-sandbox.selfheal.internal/catalogue",
      status: "healthy",
      fieldSchema: JSON.stringify({
        fields: [
          {
            name: "upc",
            type: "string",
            required: true,
            description: "Universal Product Code (UPC / SKU identifier)",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Book display title",
          },
          {
            name: "price",
            type: "number",
            required: true,
            description: "Book unit price in GBP (£)",
          },
          {
            name: "rating",
            type: "number",
            required: false,
            description: "Customer star rating (1.0 to 5.0)",
          },
          {
            name: "availability",
            type: "string",
            required: true,
            description: "Stock availability status (e.g. 'In stock (22 available)')",
          },
        ],
      }),
      currentTemplate: `// Bright Data Scraper Studio Collector Template: c_books_toscrape
function extract(page) {
  return page.queryAll('article.product_pod').map(pod => {
    const ratingClass = pod.query('.star-rating')?.attr('class') || '';
    const ratingMap = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };
    const ratingWord = ratingClass.replace('star-rating', '').trim();

    return {
      upc: pod.query('.product_price .instock')?.attr('data-upc') || pod.query('h3 a')?.attr('href')?.replace(/[^a-zA-Z0-9]/g, '').slice(-16),
      title: pod.query('h3 a')?.attr('title') || pod.query('h3 a')?.text?.trim(),
      price: parseFloat(pod.query('.price_color')?.text?.replace(/[^0-9.]/g, '')),
      rating: ratingMap[ratingWord] || null,
      availability: pod.query('.instock.availability')?.text?.trim()
    };
  });
}`,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    },
  });

  // Create baseline healthy run for books collector
  const initialRun = await prisma.run.create({
    data: {
      collectorId: booksCollector.id,
      status: "healthy",
      snapshotId: "s_books_init_01",
      durationMs: 380,
      rawData: JSON.stringify([
        {
          upc: "a897fe39b1053632",
          title: "A Light in the Attic",
          price: 51.77,
          rating: 3,
          availability: "In stock (22 available)",
        },
        {
          upc: "90fa61229261140a",
          title: "Tipping the Velvet",
          price: 53.74,
          rating: 1,
          availability: "In stock (20 available)",
        },
        {
          upc: "6990aed3f25649fc",
          title: "Soumission",
          price: 50.1,
          rating: 1,
          availability: "In stock (20 available)",
        },
      ]),
      validatedData: JSON.stringify([
        {
          upc: "a897fe39b1053632",
          title: "A Light in the Attic",
          price: 51.77,
          rating: 3,
          availability: "In stock (22 available)",
        },
        {
          upc: "90fa61229261140a",
          title: "Tipping the Velvet",
          price: 53.74,
          rating: 1,
          availability: "In stock (20 available)",
        },
        {
          upc: "6990aed3f25649fc",
          title: "Soumission",
          price: 50.1,
          rating: 1,
          availability: "In stock (20 available)",
        },
      ]),
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    },
  });

  // 2. SaaS Pricing Matrix Collector
  await prisma.collector.create({
    data: {
      name: "CloudScale SaaS Tier Pricing Matrix",
      collectorId: "c_saas_pricing",
      targetUrl: "https://cloudscale-demo.io/pricing",
      status: "healthy",
      fieldSchema: JSON.stringify({
        fields: [
          {
            name: "planName",
            type: "string",
            required: true,
            description: "Subscription tier name (e.g. Starter, Pro, Enterprise)",
          },
          {
            name: "monthlyPrice",
            type: "number",
            required: true,
            description: "Monthly subscription price in USD",
          },
          {
            name: "isPopular",
            type: "boolean",
            required: true,
            description: "Whether the tier is badged as Most Popular",
          },
          {
            name: "features",
            type: "array",
            required: true,
            description: "List of plan features",
          },
        ],
      }),
      currentTemplate: `// Bright Data Scraper Studio Collector Template: c_saas_pricing
function extract(page) {
  return page.queryAll('.pricing-card').map(card => ({
    planName: card.query('.plan-title')?.text?.trim(),
    monthlyPrice: parseFloat(card.query('.monthly-rate')?.text?.replace(/[^0-9.]/g, '')),
    isPopular: Boolean(card.query('.badge-featured')),
    features: card.queryAll('.feature-item').map(f => f.text.trim())
  }));
}`,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    },
  });

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
