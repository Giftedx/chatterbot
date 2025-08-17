#!/usr/bin/env node
/*
 Upsert guild decision overrides via CLI (no admin commands).
 Usage:
   node scripts/upsert-guild-decision-overrides.mjs <guildId> '{"ambientThreshold":30,"maxMentionsAllowed":5}'
*/

async function getPrisma() {
  try {
    const mod = await import('@prisma/client');
    const Client = mod?.PrismaClient || mod?.default?.PrismaClient || mod?.default;
    if (!Client) throw new Error('PrismaClient not found');
    return new Client();
  } catch (e) {
    console.error('Prisma client not available. Run: npx prisma generate');
    process.exit(1);
  }
}

async function main() {
  const [, , guildId, json] = process.argv;
  if (!guildId || !json) {
    console.error('Usage: node scripts/upsert-guild-decision-overrides.mjs <guildId> <json>');
    process.exit(1);
  }
  let overrides;
  try { overrides = JSON.parse(json); } catch (e) {
    console.error('Invalid JSON for overrides');
    process.exit(1);
  }
  const prisma = await getPrisma();
  try {
    const res = await prisma.guildDecisionOverride.upsert({
      where: { guildId },
      update: { overrides },
      create: { guildId, overrides },
    });
    console.log('Upserted overrides for guild', guildId, res.overrides);
  } catch (e) {
    console.error('Failed to upsert overrides:', e?.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
