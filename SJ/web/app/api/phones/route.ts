import { getCloudPhones } from "@/lib/geelark";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const phones = await getCloudPhones();
    return NextResponse.json(phones);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
