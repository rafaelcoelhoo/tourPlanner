import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedBase } from "./base";

const prisma = new PrismaClient();
await seedBase(prisma);
await prisma.$disconnect();
