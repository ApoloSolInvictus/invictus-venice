import { NextResponse } from "next/server";
import { AGORA_CHANNEL, getAgoraMembers } from "@/lib/agora";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    channel: AGORA_CHANNEL,
    members: getAgoraMembers(),
  });
}
