import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic, MODEL } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let csvContent: string;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    csvContent = await file.text();
  } else {
    const body = await req.json();
    csvContent = body.csvContent;
  }

  if (!csvContent || typeof csvContent !== "string") {
    return NextResponse.json({ error: "No CSV content found" }, { status: 400 });
  }

  // Limit to 50KB to keep Claude context reasonable
  const truncated = csvContent.slice(0, 50000);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: `You are a financial analyst parsing bank statement CSV data to identify recurring vendor payments for a small business.
Look for recurring charges that appear to be business vendors (suppliers, services, software, utilities, etc.).
Group duplicate merchant names and calculate a monthly average.
Return ONLY a JSON array — no explanation, no markdown. Example:
[
  { "name": "Sysco Foods", "category": "FOOD_BEVERAGE", "monthlyAmount": 4200 },
  { "name": "Square POS", "category": "POS_SOFTWARE", "monthlyAmount": 149 }
]
Valid categories: FOOD_BEVERAGE, CLEANING, LINEN_LAUNDRY, POS_SOFTWARE, DELIVERY_PLATFORM, INSURANCE, UTILITIES, SHIPPING_PACKAGING, EQUIPMENT_RENTAL, OTHER
Rules:
- Only include vendors with clear recurring patterns (2+ occurrences) or large one-time amounts over $500
- Skip personal charges, ATM withdrawals, payroll, and tax payments
- Normalize merchant names (remove transaction IDs, location codes)
- monthlyAmount should be a monthly average rounded to nearest dollar
- Return at most 20 vendors`,
    messages: [
      {
        role: "user",
        content: `Parse this bank statement CSV and identify recurring vendor payments:\n\n${truncated}`,
      },
    ],
  });

  const text = (response.content[0] as Anthropic.TextBlock).text.trim();

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    return NextResponse.json({ vendors: [] });
  }

  try {
    const vendors = JSON.parse(match[0]);
    return NextResponse.json({ vendors });
  } catch {
    return NextResponse.json({ vendors: [] });
  }
}
