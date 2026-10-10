import { bundleController } from "@/server/presentation/controller/bundleController";

export const POST = (req: Request) => bundleController.build(req);
