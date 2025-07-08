-- CreateTable
CREATE TABLE "user_memories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "memories" TEXT NOT NULL,
    "preferences" TEXT,
    "summary" TEXT,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memoryCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_memories_userId_key" ON "user_memories"("userId");

-- CreateIndex
CREATE INDEX "user_memories_userId_guildId_idx" ON "user_memories"("userId", "guildId");
