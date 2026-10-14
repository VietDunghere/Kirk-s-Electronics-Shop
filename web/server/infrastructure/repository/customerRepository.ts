// infrastructure.repository — Customer persistence (table User). Prisma calls only, no business rules.
import { prisma } from "../database/prisma";
import { Customer } from "../../domain/customer/customer";

export const customerRepository = {
  /** Hình 1 findByUsername: the customer's user name is the e-mail address. */
  async findByUsername(username: string): Promise<Customer | null> {
    const row = await prisma.user.findUnique({ where: { email: username } });
    return row ? Customer.fromRecord(row) : null;
  },

  findProfileById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, createdAt: true }
    });
  },

  async save(data: { fullName: string; email: string; passwordHash: string }): Promise<Customer> {
    return Customer.fromRecord(await prisma.user.create({ data }));
  }
};
