async function testLiveApi() {
  const ts = Date.now();
  const formData = new FormData();
  formData.append('name', `Live Performer ${ts}`);
  formData.append('email', `live_perf_${ts}@meetbyvibe.internal`);
  formData.append('phone', `+9198${Math.floor(10000000 + Math.random() * 90000000)}`);
  formData.append('role', 'PERFORMER');
  formData.append('gender', 'FEMALE');
  formData.append('avatarUrl', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
  formData.append('photoUrls', JSON.stringify([
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900',
  ]));

  console.log("Sending POST http://localhost:4000/api/v1/users with FormData...");
  const res = await fetch('http://localhost:4000/api/v1/users', {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  console.log("Response status:", res.status);
  console.log("Response data:", JSON.stringify(json, null, 2));
}

testLiveApi().catch(console.error).finally(() => process.exit(0));
