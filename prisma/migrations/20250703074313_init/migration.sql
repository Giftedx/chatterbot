-- CreateTable
CREATE TABLE "personas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "styleHints" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT,
    "userId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "isSuccess" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_name_key" ON "personas"("name");
