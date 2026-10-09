import { userService } from "../src/modeles/user/user.service.js";

async function testCreate() {
  const timestamp = Date.now();
  const testUserData = {
    name: `Test Performer ${timestamp}`,
    email: `test_performer_${timestamp}@meetbyvibe.internal`,
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    role: "PERFORMER" as const,
    gender: "FEMALE" as const,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    photoUrls: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900",
    ],
  };

  console.log("Creating test user with 5 photos via userService.create...");
  const created = await userService.create(testUserData);
  console.log("Created user ID:", created.id);
  console.log("Created user name:", created.name);
  console.log("Created user photos count:", created.photos?.length);
  console.log("Photos in response:", created.photos?.map(p => ({ id: p.id, url: p.imageUrl, order: p.order })));

  if (created.photos && created.photos.length === 5) {
    console.log("✅ SUCCESS: 5 photos successfully saved to DB and returned in response!");
  } else {
    console.error("❌ FAILED: Photos count is not 5:", created.photos?.length);
  }

  // Clean up test user
  await userService.delete(created.id);
  console.log("Cleaned up test user.");
}

testCreate().catch(console.error).finally(() => process.exit(0));
