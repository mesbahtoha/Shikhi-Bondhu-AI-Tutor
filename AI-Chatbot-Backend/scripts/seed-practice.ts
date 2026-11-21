/**
 * Seeds book-based practice questions for every published chapter and all
 * seven question types. Safe to run repeatedly; pass --force to rebuild the
 * auto-seeded sets (admin-authored sets are never touched).
 *
 * Run: npm run db:seed-practice -- [--force]
 */
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { ensureIndexes } from '../src/database/indexes';
import { seedAutoPracticeQuestions } from '../src/services/practice/auto-seed.service';

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  await connectDatabase();
  await ensureIndexes();
  const stats = await seedAutoPracticeQuestions({ force });
  console.log('Practice auto-seed finished:', stats);
  await disconnectDatabase();
}

main().catch((error: unknown) => {
  console.error('Practice auto-seed failed:', error);
  process.exit(1);
});
