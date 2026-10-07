import { productController } from "@/server/presentation/controller/productController";

export const GET = (_req: Request, { params }: { params: { id: string } }) => productController.viewDetail(params.id);
