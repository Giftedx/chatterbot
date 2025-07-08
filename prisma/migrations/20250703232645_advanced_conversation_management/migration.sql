-- CreateTable
CREATE TABLE "conversation_threads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "threadTitle" TEXT,
    "currentTopic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadId" INTEGER,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "topicTags" TEXT,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "contextRelevant" BOOLEAN NOT NULL DEFAULT true,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachmentData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversation_topics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "firstMentioned" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMentioned" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "importance" REAL NOT NULL DEFAULT 0.5
);

-- CreateTable
CREATE TABLE "conversation_thread_topics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "relevance" REAL NOT NULL DEFAULT 0.5,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_thread_topics_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversation_thread_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "conversation_topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "conversation_threads_channelId_userId_idx" ON "conversation_threads"("channelId", "userId");

-- CreateIndex
CREATE INDEX "conversation_threads_status_lastActivity_idx" ON "conversation_threads"("status", "lastActivity");

-- CreateIndex
CREATE INDEX "conversation_messages_channelId_createdAt_idx" ON "conversation_messages"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_messages_threadId_createdAt_idx" ON "conversation_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_messages_importance_contextRelevant_idx" ON "conversation_messages"("importance", "contextRelevant");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_topics_name_key" ON "conversation_topics"("name");

-- CreateIndex
CREATE INDEX "conversation_topics_category_importance_idx" ON "conversation_topics"("category", "importance");

-- CreateIndex
CREATE INDEX "conversation_topics_frequency_lastMentioned_idx" ON "conversation_topics"("frequency", "lastMentioned");

-- CreateIndex
CREATE INDEX "conversation_thread_topics_relevance_lastSeen_idx" ON "conversation_thread_topics"("relevance", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_thread_topics_threadId_topicId_key" ON "conversation_thread_topics"("threadId", "topicId");
