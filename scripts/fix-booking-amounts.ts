import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function fixAmounts() {
  try {
    const bookings = await prisma.booking.findMany({
      include: { performer: true, payments: true }
    });

    console.log(`Found ${bookings.length} bookings to review.`);

    for (const b of bookings) {
      const fixedRate = b.hourlyRate || b.performer?.hourlyRate || 399;
      console.log(`Booking ${b.bookingCode}: updating totalAmount from ${b.totalAmount} to ${fixedRate}`);
      
      await prisma.booking.update({
        where: { id: b.id },
        data: {
          totalAmount: fixedRate,
          advanceAmount: fixedRate,
          hourlyRate: fixedRate,
        }
      });

      for (const p of b.payments) {
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            amount: fixedRate
          }
        });
      }
    }

    console.log("All booking amounts updated successfully.");
  } catch (error) {
    console.error("Error updating booking amounts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAmounts();
