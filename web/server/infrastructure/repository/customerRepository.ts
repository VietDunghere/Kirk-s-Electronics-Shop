// infrastructure.repository — Customer persistence (table User). Prisma calls only, no business rules.
import { prisma } from "../database/prisma";
import type { Customer } from "../../domain/customer/customer";

export const customerRepository = {
  findByEmail(email: string): Promise<Customer | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findProfileById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, createdAt: true }
    });
  },

  save(data: { fullName: string; email: string; passwordHash: string }): Promise<Customer> {
    return prisma.user.create({ data });
  }
};
