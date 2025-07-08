/*
  Warnings:

  - A unique constraint covering the columns `[userId,guildId]` on the table `user_memories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_memories_userId_guildId_idx";

-- DropIndex
DROP INDEX "user_memories_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "user_memories_userId_guildId_key" ON "user_memories"("userId", "guildId");
