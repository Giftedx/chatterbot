-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "channelId" TEXT,
    "authorId" TEXT,
    "tags" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EscalationTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InteractionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "knowledgeGrounded" BOOLEAN NOT NULL,
    "shouldEscalate" BOOLEAN NOT NULL,
    "processingTime" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_source_idx" ON "KnowledgeEntry"("source");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_channelId_idx" ON "KnowledgeEntry"("channelId");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_confidence_idx" ON "KnowledgeEntry"("confidence");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_tags_idx" ON "KnowledgeEntry"("tags");

-- CreateIndex
CREATE INDEX "EscalationTicket_status_idx" ON "EscalationTicket"("status");

-- CreateIndex
CREATE INDEX "EscalationTicket_priority_idx" ON "EscalationTicket"("priority");

-- CreateIndex
CREATE INDEX "EscalationTicket_userId_idx" ON "EscalationTicket"("userId");

-- CreateIndex
CREATE INDEX "EscalationTicket_channelId_idx" ON "EscalationTicket"("channelId");

-- CreateIndex
CREATE INDEX "InteractionLog_userId_idx" ON "InteractionLog"("userId");

-- CreateIndex
CREATE INDEX "InteractionLog_channelId_idx" ON "InteractionLog"("channelId");

-- CreateIndex
CREATE INDEX "InteractionLog_createdAt_idx" ON "InteractionLog"("createdAt");

-- CreateIndex
CREATE INDEX "InteractionLog_confidence_idx" ON "InteractionLog"("confidence");
