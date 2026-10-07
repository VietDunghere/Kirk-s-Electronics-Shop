import { productController } from "@/server/presentation/controller/productController";

export const GET = (req: Request) => productController.search(req);
