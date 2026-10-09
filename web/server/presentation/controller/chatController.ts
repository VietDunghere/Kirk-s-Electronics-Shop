// presentation.controller — ChatController: shop assistant chatbot endpoint.
import { NextResponse } from "next/server";
import { chatService } from "../../application/service/chatService";
import { fail, getSessionUser } from "./http";

export const chatController = {
  async chat(req: Request) {
    let body: { messages?: unknown; proposal?: { proposalId?: unknown; productId?: unknown; quantity?: unknown } | null; guestCart?: { productId?: unknown; qty?: unknown }[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    try {
      const session = await getSessionUser();
      return NextResponse.json(
        await chatService.reply(body.messages, {
          userId: session?.id ?? null,
          proposal: body.proposal,
          guestCart: body.guestCart
        })
      );
    } catch (e) {
      return fail(e);
    }
  }
};
