// presentation.controller — CompareController: AI product comparison (public, no login needed).
import { NextResponse } from "next/server";
import { compareService } from "../../application/service/compareService";
import { fail } from "./http";

export const compareController = {
  async compare(req: Request) {
    try {
      const body = await req.json().catch(() => ({}));
      return NextResponse.json({ comparison: await compareService.compare(body.ids, body.need) });
    } catch (e) {
      return fail(e, "Could not compare products.");
    }
  }
};
