import { prisma } from "../src/lib/prisma.js";

async function seedAllMissingPhotos() {
  const femaleDefaults = [
    "https://i.pinimg.com/736x/10/e1/0a/10e10a9d571df7ca6eb7d5b2e597ecf1.jpg",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&q=80",
  ];

  const maleDefaults = [
    "https://i.pinimg.com/736x/3f/37/48/3f3748a8f798d4a0683cde32a96404ab.jpg",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80",
  ];

  const users = await prisma.user.findMany({
    include: { photos: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  console.log(`Checking ${users.length} total users in DB...`);

  for (const u of users) {
    if (u.photos.length === 0) {
      console.log(`Seeding 5 gallery photos for ${u.name} (${u.gender}, ${u.id})...`);
      const isMale = String(u.gender || '').trim().toUpperCase() === 'MALE';
      const defaults = isMale ? maleDefaults : femaleDefaults;
      const avatar = u.avatarUrl || defaults[0] || "";
      const photos: string[] = [
        avatar,
        defaults[1] ?? "",
        defaults[2] ?? "",
        defaults[3] ?? "",
        defaults[4] ?? "",
      ].filter(Boolean);

      await prisma.userPhoto.createMany({
        data: photos.map((url, idx) => ({
          userId: u.id,
          imageUrl: url,
          caption: `Photo ${idx + 1}`,
          order: idx,
        })),
      });
      console.log(`✔ Seeded 5 photos for ${u.name}!`);
    }
  }

  console.log("All users now have 5 gallery photos in DB.");
}

seedAllMissingPhotos().catch(console.error).finally(() => process.exit(0));
