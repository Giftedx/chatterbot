/*
  Type-only shim for restricted environments where Prisma client generation is unavailable.
  Declares a minimal MediaFile interface aligned with prisma/schema.prisma to satisfy TypeScript references.
  No runtime values are exported.
*/
declare module '@prisma/client' {
  export interface MediaFile {
    id: number;
    userId: string;
    guildId?: string | null;
    channelId: string;
    messageId?: string | null;

    filename: string;
    originalName: string;
    fileType: string; // 'image' | 'audio' | 'video' | 'document' | 'code' | 'other'
    mimeType: string;
    fileSize: number;
    filePath: string;

    processingStatus: string; // 'pending' | 'processing' | 'completed' | 'failed'
    processedAt?: Date | null;
    processingError?: string | null;

    extractedText?: string | null;
    description?: string | null;
    tags?: string | null;
    categories?: string | null;

    imageMetadata?: unknown | null;
    audioMetadata?: unknown | null;
    documentMetadata?: unknown | null;

    visionAnalysis?: unknown | null;
    audioAnalysis?: unknown | null;
    contentSafety?: unknown | null;

    createdAt: Date;
    updatedAt: Date;
  }
}