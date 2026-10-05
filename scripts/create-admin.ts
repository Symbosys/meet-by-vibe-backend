import { prisma } from "../src/lib/prisma.js";
import { normalizeEmail, normalizePhone } from "../src/utils/normalization.util.js";
import { hashPassword } from "../src/utils/password.util.js";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const email = normalizeEmail(required("SUPER_ADMIN_EMAIL"));
const phone = normalizePhone(required("SUPER_ADMIN_PHONE"));
const password = required("SUPER_ADMIN_PASSWORD");
if (password.length < 8) throw new Error("SUPER_ADMIN_PASSWORD must contain at least 8 characters");

try {
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { id: true, role: true } });
  if (existing?.role === "ADMIN") {
    console.log("Admin already exists", existing);
  } else {
    if (existing) throw new Error(`Email or phone already belongs to a ${existing.role.toLowerCase()} account (${existing.id})`);
    const admin = await prisma.user.create({
      data: {
        role: "ADMIN",
        isActive: true,
        isVerified: true,
        name: required("SUPER_ADMIN_NAME"),
        email,
        phone,
        passwordHash: await hashPassword(password),
        address: process.env.SUPER_ADMIN_ADDRESS?.trim() || "Operational administrator",
        city: process.env.SUPER_ADMIN_CITY?.trim() || "Ahmedabad",
        state: process.env.SUPER_ADMIN_STATE?.trim() || "Gujarat",
        gender: "OTHER",
      },
      select: { id: true, email: true, role: true, isActive: true },
    });
    console.log("Admin created successfully", admin);
  }
} finally {
  await prisma.$disconnect();
}
