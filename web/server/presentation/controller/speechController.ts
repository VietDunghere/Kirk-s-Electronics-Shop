// presentation.controller — SpeechController: audio of a spoken search -> text (public, no login needed).
import { NextResponse } from "next/server";
import { speechService } from "../../application/service/speechService";
import { fail } from "./http";

export const speechController = {
  /** POST multipart/form-data with an "audio" file -> { text }. */
  async transcribe(req: Request) {
    try {
      const form = await req.formData().catch(() => null);
      const file = form?.get("audio");
      const audio = file instanceof Blob ? file : null;
      const name = file instanceof File && file.name ? file.name : "voice.webm";
      return NextResponse.json({ text: await speechService.transcribe(audio, name) });
    } catch (e) {
      return fail(e, "Voice search failed.");
    }
  }
};
