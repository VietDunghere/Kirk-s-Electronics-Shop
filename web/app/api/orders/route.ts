import { orderController } from "@/server/presentation/controller/orderController";
import { checkoutController } from "@/server/presentation/controller/checkoutController";

export const GET = () => orderController.listMine();
export const POST = (req: Request) => checkoutController.checkout(req);
