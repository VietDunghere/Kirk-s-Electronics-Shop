import { cartController } from "@/server/presentation/controller/cartController";

export const GET = () => cartController.viewCart();
export const POST = (req: Request) => cartController.addToCart(req);
export const DELETE = () => cartController.clearCart();
