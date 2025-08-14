/*
  Warnings:

  - You are about to drop the `KnowledgeEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversation_thread_topics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversation_threads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `threadId` on the `conversation_messages` table. All the data in the column will be lost.
  - You are about to drop the column `conversationThreadId` on the `multimodal_conversations` table. All the data in the column will be lost.
  - Added the required column `conversationId` to the `multimodal_conversations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "KnowledgeEntry_tags_idx";

-- DropIndex
DROP INDEX "KnowledgeEntry_confidence_idx";

-- DropIndex
DROP INDEX "KnowledgeEntry_channelId_idx";

-- DropIndex
DROP INDEX "KnowledgeEntry_source_idx";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "conversation_thread_topics_threadId_topicId_key";

-- DropIndex
DROP INDEX "conversation_thread_topics_relevance_lastSeen_idx";

-- DropIndex
DROP INDEX "conversation_threads_status_lastActivity_idx";

-- DropIndex
DROP INDEX "conversation_threads_channelId_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "KnowledgeEntry";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "conversation_thread_topics";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "conversation_threads";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "user_conversation_threads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "channelId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "threadTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "optedInAt" DATETIME,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" DATETIME,
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "privacyAcceptedAt" DATETIME,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "consentToStore" BOOLEAN NOT NULL DEFAULT false,
    "consentToAnalyze" BOOLEAN NOT NULL DEFAULT false,
    "consentToPersonalize" BOOLEAN NOT NULL DEFAULT false,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataExportedAt" DATETIME,
    "scheduledDeletion" DATETIME,
    "dmPreferred" BOOLEAN NOT NULL DEFAULT false,
    "lastThreadId" TEXT,
    "pauseUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "memory_embeddings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memoryId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "kind" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0.7,
    "lastSeenAt" DATETIME NOT NULL,
    "sourceMsgId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memory_embeddings_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "user_memories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" REAL NOT NULL DEFAULT 0.7,
    "recencyScore" REAL NOT NULL DEFAULT 0,
    "sourceMsgId" TEXT,
    "guildId" TEXT,
    "embedding" BLOB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KBSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "fileId" TEXT,
    "checksum" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KBChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" BLOB,
    "section" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "model_selections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "userId" TEXT,
    "guildId" TEXT
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "guildId" TEXT,
    "channelId" TEXT,
    "threadId" TEXT,
    "msgId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StyleProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "tone" TEXT,
    "formality" TEXT,
    "emojis" BOOLEAN DEFAULT true,
    "readingLvl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StyleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guild_knowledge_base" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "tags" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "embedding" BLOB,
    "addedBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversation_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "hasImages" BOOLEAN NOT NULL DEFAULT false,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "hasDocuments" BOOLEAN NOT NULL DEFAULT false,
    "hasCode" BOOLEAN NOT NULL DEFAULT false,
    "mediaFileIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_conversation_messages" ("attachmentData", "channelId", "content", "contextRelevant", "createdAt", "hasAttachments", "hasAudio", "hasCode", "hasDocuments", "hasImages", "id", "importance", "mediaFileIds", "role", "tokens", "topicTags", "userId") SELECT "attachmentData", "channelId", "content", "contextRelevant", "createdAt", "hasAttachments", "hasAudio", "hasCode", "hasDocuments", "hasImages", "id", "importance", "mediaFileIds", "role", "tokens", "topicTags", "userId" FROM "conversation_messages";
DROP TABLE "conversation_messages";
ALTER TABLE "new_conversation_messages" RENAME TO "conversation_messages";
CREATE INDEX "conversation_messages_channelId_createdAt_idx" ON "conversation_messages"("channelId", "createdAt");
CREATE INDEX "conversation_messages_importance_contextRelevant_idx" ON "conversation_messages"("importance", "contextRelevant");
CREATE INDEX "conversation_messages_hasImages_hasAudio_hasDocuments_idx" ON "conversation_messages"("hasImages", "hasAudio", "hasDocuments");
CREATE TABLE "new_multimodal_conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" TEXT NOT NULL,
    "mediaReferences" TEXT,
    "visualContext" JSONB,
    "audioContext" JSONB,
    "documentContext" JSONB,
    "multimodalSummary" TEXT,
    "keyVisualElements" TEXT,
    "extractedEntities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_multimodal_conversations" ("audioContext", "createdAt", "documentContext", "extractedEntities", "id", "keyVisualElements", "mediaReferences", "multimodalSummary", "updatedAt", "visualContext") SELECT "audioContext", "createdAt", "documentContext", "extractedEntities", "id", "keyVisualElements", "mediaReferences", "multimodalSummary", "updatedAt", "visualContext" FROM "multimodal_conversations";
DROP TABLE "multimodal_conversations";
ALTER TABLE "new_multimodal_conversations" RENAME TO "multimodal_conversations";
CREATE INDEX "multimodal_conversations_conversationId_idx" ON "multimodal_conversations"("conversationId");
CREATE TABLE "new_user_memories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "memories" TEXT NOT NULL,
    "preferences" TEXT,
    "summary" TEXT,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memoryCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "decayRate" REAL NOT NULL DEFAULT 0.05,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_memories" ("createdAt", "guildId", "id", "lastUpdated", "memories", "memoryCount", "preferences", "summary", "tokenCount", "userId") SELECT "createdAt", "guildId", "id", "lastUpdated", "memories", "memoryCount", "preferences", "summary", "tokenCount", "userId" FROM "user_memories";
DROP TABLE "user_memories";
ALTER TABLE "new_user_memories" RENAME TO "user_memories";
CREATE UNIQUE INDEX "user_memories_userId_guildId_key" ON "user_memories"("userId", "guildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "user_conversation_threads_threadId_idx" ON "user_conversation_threads"("threadId");

-- CreateIndex
CREATE INDEX "user_conversation_threads_isActive_lastActivity_idx" ON "user_conversation_threads"("isActive", "lastActivity");

-- CreateIndex
CREATE UNIQUE INDEX "user_conversation_threads_userId_guildId_channelId_key" ON "user_conversation_threads"("userId", "guildId", "channelId");

-- CreateIndex
CREATE INDEX "memory_embeddings_kind_weight_idx" ON "memory_embeddings"("kind", "weight");

-- CreateIndex
CREATE INDEX "memory_embeddings_lastSeenAt_idx" ON "memory_embeddings"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Memory_userId_idx" ON "Memory"("userId");

-- CreateIndex
CREATE INDEX "Summary_userId_idx" ON "Summary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KBSource_checksum_key" ON "KBSource"("checksum");

-- CreateIndex
CREATE INDEX "KBSource_guildId_idx" ON "KBSource"("guildId");

-- CreateIndex
CREATE INDEX "KBChunk_sourceId_idx" ON "KBChunk"("sourceId");

-- CreateIndex
CREATE INDEX "model_selections_timestamp_idx" ON "model_selections"("timestamp");

-- CreateIndex
CREATE INDEX "guild_knowledge_base_guildId_idx" ON "guild_knowledge_base"("guildId");

-- CreateIndex
CREATE INDEX "guild_knowledge_base_source_idx" ON "guild_knowledge_base"("source");

-- CreateIndex
CREATE INDEX "guild_knowledge_base_confidence_idx" ON "guild_knowledge_base"("confidence");

-- CreateIndex
CREATE INDEX "guild_knowledge_base_tags_idx" ON "guild_knowledge_base"("tags");
