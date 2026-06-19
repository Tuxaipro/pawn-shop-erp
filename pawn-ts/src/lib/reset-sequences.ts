import { prisma } from './prisma.js';

/**
 * Resync PostgreSQL identity sequences after seed/migration data with explicit IDs.
 * Without this, create() can reuse ids 1..N and hit P2002 unique constraint errors.
 */
export async function resetMasterSequences() {
  const statements = [
    `SELECT setval(
      pg_get_serial_sequence('master_commodity_main_category', 'id'),
      COALESCE((SELECT MAX(id) FROM master_commodity_main_category), 0) + 1,
      false
    )`,
    `SELECT setval(
      pg_get_serial_sequence('master_commodity_sub_category', 'sid'),
      COALESCE((SELECT MAX(sid) FROM master_commodity_sub_category), 0) + 1,
      false
    )`,
    `SELECT setval(
      pg_get_serial_sequence('master_commodity_sub_item', 'i_id'),
      COALESCE((SELECT MAX(i_id) FROM master_commodity_sub_item), 0) + 1,
      false
    )`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
}
