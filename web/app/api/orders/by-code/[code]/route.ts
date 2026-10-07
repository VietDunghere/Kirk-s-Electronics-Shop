import { orderController } from "@/server/presentation/controller/orderController";

export const GET = (_req: Request, { params }: { params: { code: string } }) => orderController.trackOrder(params.code);
