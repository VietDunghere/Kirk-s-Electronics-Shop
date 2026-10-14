import { productController } from "@/server/presentation/controller/productController";

export const POST = (req: Request) => productController.searchByImage(req);
