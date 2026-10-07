import { customerController } from "@/server/presentation/controller/customerController";

export const GET = () => customerController.me();
