export default async function globalSetup() {
  const healthUrl = 'http://localhost:3002/api/v1/health';
  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return;
    } catch {
      /* API not ready yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(
    'Pawn API is not running on http://localhost:3002. Start it with: cd pawn-ts && npm run dev'
  );
}
