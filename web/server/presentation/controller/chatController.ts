// presentation.controller — ChatController: shop assistant chatbot endpoint.
import { NextResponse } from "next/server";
import { chatService } from "../../application/service/chatService";
import { fail } from "./http";

export const chatController = {
  async chat(req: Request) {
    let body: { messages?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    try {
      return NextResponse.json(await chatService.reply(body.messages));
    } catch (e) {
      return fail(e);
    }
  }
};
