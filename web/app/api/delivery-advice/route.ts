import { deliveryAdvisorController } from "@/server/presentation/controller/deliveryAdvisorController";

export const POST = (req: Request) => deliveryAdvisorController.advise(req);
