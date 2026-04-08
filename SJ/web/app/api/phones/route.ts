import { getCloudPhones } from "@/lib/geelark";
import { NextRequest, NextResponse } from "next/server";
import { filterPhonesByUser, requireApiUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "devices");
  if (u instanceof NextResponse) return u;
  try {
    const phones = await getCloudPhones();
    return NextResponse.json(filterPhonesByUser(u, phones));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
