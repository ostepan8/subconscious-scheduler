import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, clearChatMessages } from "@/lib/chat-storage";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json([]);
  }
  const messages = await getChatMessages(conversationId);
  return NextResponse.json(messages);
}

export async function DELETE(req: NextRequest) {
  const { conversationId } = (await req.json()) as { conversationId: string };
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }
  await clearChatMessages(conversationId);
  return NextResponse.json({ success: true });
}
