import { compareController } from "@/server/presentation/controller/compareController";

export const POST = (req: Request) => compareController.compare(req);
