import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic, MODEL } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const vendors: Array<{ name: string; category: string; amount: number }> = [];

  for (const file of files.slice(0, 5)) {
    if (file.type !== "application/pdf") continue;
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              } as Anthropic.DocumentBlockParam,
              {
                type: "text",
                text: `Extract all vendor/supplier names and amounts from this invoice.
For each vendor, determine the best category from this list:
FOOD_BEVERAGE, CLEANING, LINEN_LAUNDRY, POS_SOFTWARE, DELIVERY_PLATFORM, INSURANCE, UTILITIES, SHIPPING_PACKAGING, EQUIPMENT_RENTAL, OTHER

Respond ONLY with a JSON array like this:
[{"name": "Sysco Foods", "category": "FOOD_BEVERAGE", "amount": 4200}, ...]

If you can't determine a field, use null. Only include recurring service vendors, not one-time purchases.`,
              },
            ],
          },
        ],
      });

      const text = (response.content[0] as Anthropic.TextBlock).text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        vendors.push(...parsed.filter((v: { name: string }) => v.name));
      }
    } catch (err) {
      console.error("PDF parsing error:", err);
    }
  }

  return NextResponse.json({ vendors });
}
