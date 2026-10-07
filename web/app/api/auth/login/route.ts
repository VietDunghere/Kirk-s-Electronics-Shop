import { customerController } from "@/server/presentation/controller/customerController";

export const POST = (req: Request) => customerController.login(req);
