// presentation.controller — BundleController: AI "build me a full set for this budget" (public, no login needed).
import { NextResponse } from "next/server";
import { bundleService } from "../../application/service/bundleService";
import { fail } from "./http";

export const bundleController = {
  async build(req: Request) {
    try {
      const body = await req.json().catch(() => ({}));
      return NextResponse.json({ bundle: await bundleService.build(body) });
    } catch (e) {
      return fail(e, "Could not build the set.");
    }
  }
};
