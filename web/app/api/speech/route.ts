import { speechController } from "@/server/presentation/controller/speechController";

export const POST = (req: Request) => speechController.transcribe(req);
