-- CreateTable
CREATE TABLE "media_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" DATETIME,
    "processingError" TEXT,
    "extractedText" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "categories" TEXT,
    "imageMetadata" JSONB,
    "audioMetadata" JSONB,
    "documentMetadata" JSONB,
    "visionAnalysis" JSONB,
    "audioAnalysis" JSONB,
    "contentSafety" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "media_insights" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaFileId" INTEGER NOT NULL,
    "insightType" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "content" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "processingTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_insights_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "media_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "multimodal_conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationThreadId" INTEGER NOT NULL,
    "mediaReferences" TEXT,
    "visualContext" JSONB,
    "audioContext" JSONB,
    "documentContext" JSONB,
    "multimodalSummary" TEXT,
    "keyVisualElements" TEXT,
    "extractedEntities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "multimodal_conversations_conversationThreadId_fkey" FOREIGN KEY ("conversationThreadId") REFERENCES "conversation_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_moderation_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaFileId" INTEGER,
    "messageId" TEXT,
    "moderationStatus" TEXT NOT NULL,
    "safetyScore" REAL,
    "flaggedCategories" TEXT,
    "adultContent" REAL,
    "violenceContent" REAL,
    "hateSpeech" REAL,
    "spamContent" REAL,
    "actionTaken" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_moderation_results_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "media_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ConversationMessageToMediaFile" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ConversationMessageToMediaFile_A_fkey" FOREIGN KEY ("A") REFERENCES "conversation_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ConversationMessageToMediaFile_B_fkey" FOREIGN KEY ("B") REFERENCES "media_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversation_messages" (
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
    "hasImages" BOOLEAN NOT NULL DEFAULT false,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "hasDocuments" BOOLEAN NOT NULL DEFAULT false,
    "hasCode" BOOLEAN NOT NULL DEFAULT false,
    "mediaFileIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversation_messages" ("attachmentData", "channelId", "content", "contextRelevant", "createdAt", "hasAttachments", "id", "importance", "role", "threadId", "tokens", "topicTags", "userId") SELECT "attachmentData", "channelId", "content", "contextRelevant", "createdAt", "hasAttachments", "id", "importance", "role", "threadId", "tokens", "topicTags", "userId" FROM "conversation_messages";
DROP TABLE "conversation_messages";
ALTER TABLE "new_conversation_messages" RENAME TO "conversation_messages";
CREATE INDEX "conversation_messages_channelId_createdAt_idx" ON "conversation_messages"("channelId", "createdAt");
CREATE INDEX "conversation_messages_threadId_createdAt_idx" ON "conversation_messages"("threadId", "createdAt");
CREATE INDEX "conversation_messages_importance_contextRelevant_idx" ON "conversation_messages"("importance", "contextRelevant");
CREATE INDEX "conversation_messages_hasImages_hasAudio_hasDocuments_idx" ON "conversation_messages"("hasImages", "hasAudio", "hasDocuments");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "media_files_userId_createdAt_idx" ON "media_files"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "media_files_fileType_createdAt_idx" ON "media_files"("fileType", "createdAt");

-- CreateIndex
CREATE INDEX "media_files_processingStatus_idx" ON "media_files"("processingStatus");

-- CreateIndex
CREATE INDEX "media_files_channelId_createdAt_idx" ON "media_files"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "media_insights_mediaFileId_insightType_idx" ON "media_insights"("mediaFileId", "insightType");

-- CreateIndex
CREATE INDEX "media_insights_insightType_confidence_idx" ON "media_insights"("insightType", "confidence");

-- CreateIndex
CREATE INDEX "multimodal_conversations_conversationThreadId_idx" ON "multimodal_conversations"("conversationThreadId");

-- CreateIndex
CREATE INDEX "content_moderation_results_moderationStatus_idx" ON "content_moderation_results"("moderationStatus");

-- CreateIndex
CREATE INDEX "content_moderation_results_safetyScore_idx" ON "content_moderation_results"("safetyScore");

-- CreateIndex
CREATE INDEX "content_moderation_results_reviewRequired_idx" ON "content_moderation_results"("reviewRequired");

-- CreateIndex
CREATE UNIQUE INDEX "_ConversationMessageToMediaFile_AB_unique" ON "_ConversationMessageToMediaFile"("A", "B");

-- CreateIndex
CREATE INDEX "_ConversationMessageToMediaFile_B_index" ON "_ConversationMessageToMediaFile"("B");
