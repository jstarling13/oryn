import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = "claude-sonnet-4-20250514";

export interface BenchmarkResult {
  marketRateLow: number | null;
  marketRateHigh: number | null;
  marketRateTypical: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesSummary: string;
  classification: "FAIR" | "ELEVATED" | "OVERPRICED" | "UNKNOWN";
  rawResearch: string;
}

export async function runBenchmarkResearch(
  vendorName: string,
  category: string,
  city: string,
  currentMonthlyAmount: number,
  businessType: string
): Promise<BenchmarkResult> {
  const searchQuery = buildSearchQuery(category, city, businessType);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
      } as unknown as Anthropic.Tool,
    ],
    system: [
      {
        type: "text",
        text: `You are a market research analyst helping small businesses understand fair vendor pricing.
Your job is to research current market rates for vendor services and provide actionable pricing benchmarks.
Always base your findings on publicly available information. Be specific and cite your sources.
When you have enough data, output a JSON object with this exact structure:
{
  "marketRateLow": <number or null>,
  "marketRateHigh": <number or null>,
  "marketRateTypical": <number or null>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "sourcesSummary": "<2-3 sentence summary of what you found and where>",
  "classification": "FAIR" | "ELEVATED" | "OVERPRICED" | "UNKNOWN"
}
Classification rules (compare currentMonthlyAmount to marketRateTypical):
- FAIR: within 10% of typical
- ELEVATED: 10-25% above typical
- OVERPRICED: more than 25% above typical
- UNKNOWN: insufficient data to determine
Output ONLY the JSON at the end, after your research.`,
        cache_control: { type: "ephemeral" },
      },
    ] as Anthropic.MessageParam["content"] & Anthropic.Messages.TextBlockParam[],
    messages: [
      {
        role: "user",
        content: `Research market rates for this vendor:

Vendor: ${vendorName}
Category: ${category}
Business location: ${city}
Business type: ${businessType}
Current monthly payment: $${currentMonthlyAmount}

Search query to use: "${searchQuery}"

Research current market pricing for this type of service for small businesses in this region. Look for:
1. Industry pricing guides or surveys
2. Competitor pricing pages
3. Forum discussions from business owners
4. Published rate sheets

Then determine if $${currentMonthlyAmount}/month is fair, elevated, or overpriced.`,
      },
    ],
  });

  const rawResearch = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("\n");

  const jsonMatch = rawResearch.match(/\{[\s\S]*"marketRateLow"[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      marketRateLow: null,
      marketRateHigh: null,
      marketRateTypical: null,
      confidence: "LOW",
      sourcesSummary: "Insufficient data found for this vendor category in this region.",
      classification: "UNKNOWN",
      rawResearch,
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    ...parsed,
    rawResearch,
  };
}

export async function draftNegotiationEmail(
  vendorName: string,
  category: string,
  businessName: string,
  businessType: string,
  currentMonthlyAmount: number,
  marketRateTypical: number | null,
  marketRateLow: number | null,
  marketRateHigh: number | null,
  contractEndDate: string | null,
  notes: string | null
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: [
      {
        type: "text",
        text: `You are a professional business negotiator writing on behalf of a small business owner.
Your goal is to write a polite, professional email requesting a pricing review from a vendor.
Rules:
- Sound like a real person, not a robot or AI assistant
- Reference the business relationship positively
- Mention that you've been reviewing your costs and found similar services available at competitive rates
- Ask for a pricing discussion — do NOT name a specific number or demand
- Keep it under 200 words
- End with a clear call to action (a brief meeting or reply to discuss)
- Never be aggressive or threatening
- Do not mention AI, software, or that this email was drafted for you
- Write in first person as the business owner`,
        cache_control: { type: "ephemeral" },
      },
    ] as Anthropic.MessageParam["content"] & Anthropic.Messages.TextBlockParam[],
    messages: [
      {
        role: "user",
        content: `Draft a vendor negotiation email with these details:

Business name: ${businessName}
Business type: ${businessType}
Vendor: ${vendorName}
Service category: ${category}
Current monthly rate: $${currentMonthlyAmount}
${marketRateTypical ? `Market typical rate: $${marketRateTypical}/month` : ""}
${marketRateLow && marketRateHigh ? `Market range: $${marketRateLow}–$${marketRateHigh}/month` : ""}
${contractEndDate ? `Contract end date: ${contractEndDate}` : "No contract end date on file"}
${notes ? `Notes about vendor: ${notes}` : ""}

Write the full email including subject line. Format:
Subject: [subject]

[email body]`,
      },
    ],
  });

  return (response.content[0] as Anthropic.TextBlock).text;
}

function buildSearchQuery(
  category: string,
  city: string,
  businessType: string
): string {
  const categoryMap: Record<string, string> = {
    FOOD_BEVERAGE: "food beverage distributor pricing",
    CLEANING: "commercial cleaning service pricing",
    LINEN_LAUNDRY: "linen laundry service pricing restaurant",
    POS_SOFTWARE: "POS software pricing small business",
    DELIVERY_PLATFORM: "delivery platform fees commission rates",
    INSURANCE: "small business insurance rates",
    UTILITIES: "commercial utility rates small business",
    SHIPPING_PACKAGING: "shipping packaging costs small business",
    EQUIPMENT_RENTAL: "equipment rental rates",
    OTHER: "vendor service pricing small business",
  };

  const base = categoryMap[category] ?? "vendor pricing small business";
  return `${base} ${city} ${new Date().getFullYear()} ${businessType}`;
}
