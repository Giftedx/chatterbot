-- CreateTable
CREATE TABLE "moderation_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "strictnessLevel" TEXT NOT NULL DEFAULT 'medium',
    "enabledFeatures" TEXT NOT NULL DEFAULT 'text,image',
    "logChannelId" TEXT,
    "autoDeleteUnsafe" BOOLEAN NOT NULL DEFAULT true,
    "customKeywords" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "moderation_incidents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "contentHash" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "moderation_configs_guildId_key" ON "moderation_configs"("guildId");
