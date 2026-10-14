import { checkoutController } from "@/server/presentation/controller/checkoutController";

export const POST = (req: Request) => checkoutController.pay(req);
