import { chatController } from "@/server/presentation/controller/chatController";

export const POST = (req: Request) => chatController.chat(req);
