import { orderController } from "@/server/presentation/controller/orderController";

export const GET = (_req: Request, { params }: { params: { id: string } }) => orderController.detail(params.id);
