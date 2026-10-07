import { cartController } from "@/server/presentation/controller/cartController";

type Ctx = { params: { productId: string } };

export const PUT = (req: Request, { params }: Ctx) => cartController.updateQuantity(req, params.productId);
export const DELETE = (_req: Request, { params }: Ctx) => cartController.removeItem(params.productId);
