/**
 * Text Extraction Service
 * Handles text extraction from various document formats
 */

import { MediaFile, TextExtractionResult, DOCUMENT_PROCESSING_CONFIG } from './types.js';
import { logger } from '../../utils/logger.js';

export class DocumentTextExtractionService {
  private readonly supportedFormats = DOCUMENT_PROCESSING_CONFIG.SUPPORTED_FORMATS;

  /**
   * Extract text content from document
   */
  async extractTextContent(mediaFile: MediaFile): Promise<TextExtractionResult | null> {
    try {
      if (!this.supportedFormats.has(mediaFile.mimeType)) {
        logger.warn('Unsupported format for text extraction', {
          operation: 'text-extraction',
          metadata: { fileId: mediaFile.id, mimeType: mediaFile.mimeType }
        });
        return null;
      }

      const format = this.getDocumentFormat(mediaFile.mimeType);
      const extractedText = this.simulateTextExtraction(format);

      if (!extractedText) {
        logger.warn('No text extracted from document', {
          operation: 'text-extraction',
          metadata: { fileId: mediaFile.id }
        });
        return null;
      }

      const result: TextExtractionResult = {
        fullText: extractedText,
        wordCount: this.countWords(extractedText),
        characterCount: extractedText.length,
        paragraphCount: this.countParagraphs(extractedText),
        pageCount: this.estimatePageCount(extractedText)
      };

      logger.info('Text extraction completed', {
        operation: 'text-extraction',
        metadata: {
          fileId: mediaFile.id,
          wordCount: result.wordCount,
          characterCount: result.characterCount,
          paragraphCount: result.paragraphCount,
          pageCount: result.pageCount
        }
      });

      return result;

    } catch (error) {
      logger.error('Failed to extract text content', {
        operation: 'text-extraction',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      return null;
    }
  }

  /**
   * Get document format display name
   */
  getDocumentFormat(mimeType: string): string {
    const formatMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-powerpoint': 'PowerPoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
      'text/plain': 'Text',
      'text/markdown': 'Markdown',
      'text/csv': 'CSV',
      'application/json': 'JSON',
      'application/rtf': 'RTF'
    };

    return formatMap[mimeType] || 'Unknown';
  }

  /**
   * Check if text extraction is supported for mime type
   */
  isExtractionSupported(mimeType: string): boolean {
    return this.supportedFormats.has(mimeType);
  }

  /**
   * Extract text from specific page range (for PDF documents)
   */
  async extractTextFromPageRange(
    mediaFile: MediaFile,
    startPage: number,
    endPage: number
  ): Promise<TextExtractionResult | null> {
    try {
      // In a real implementation, this would extract text from specific page range
      const fullExtraction = await this.extractTextContent(mediaFile);
      
      if (!fullExtraction) return null;

      // Simulate page range extraction by taking a portion of the text
      const totalPages = fullExtraction.pageCount || 1;
      // const pageRatio = Math.min((endPage - startPage + 1) / totalPages, 1); // Not currently used
      const startIndex = Math.floor((startPage - 1) / totalPages * fullExtraction.fullText.length);
      const endIndex = Math.floor(endPage / totalPages * fullExtraction.fullText.length);
      
      const pageText = fullExtraction.fullText.substring(startIndex, endIndex);

      return {
        fullText: pageText,
        wordCount: this.countWords(pageText),
        characterCount: pageText.length,
        paragraphCount: this.countParagraphs(pageText),
        pageCount: endPage - startPage + 1
      };

    } catch (error) {
      logger.error('Failed to extract text from page range', {
        operation: 'page-range-extraction',
        metadata: {
          fileId: mediaFile.id,
          startPage,
          endPage,
          error: String(error)
        }
      });
      return null;
    }
  }

  /**
   * Extract text with formatting preservation
   */
  async extractFormattedText(mediaFile: MediaFile): Promise<{
    plainText: string;
    formattedText: string;
    metadata: { boldText: string[]; italicText: string[]; headings: string[] };
  } | null> {
    try {
      const textResult = await this.extractTextContent(mediaFile);
      if (!textResult) return null;

      // Simulate formatted text extraction
      const plainText = textResult.fullText;
      const formattedText = this.addSimulatedFormatting(plainText);
      
      return {
        plainText,
        formattedText,
        metadata: {
          boldText: this.extractBoldText(formattedText),
          italicText: this.extractItalicText(formattedText),
          headings: this.extractHeadings(formattedText)
        }
      };

    } catch (error) {
      logger.error('Failed to extract formatted text', {
        operation: 'formatted-text-extraction',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      return null;
    }
  }

  // Private helper methods

  private simulateTextExtraction(format: string): string {
    // This would be replaced with actual text extraction logic
    switch (format) {
      case 'PDF':
        return 'This is a sample PDF document with multiple paragraphs. It contains structured information organized in sections. The document discusses important topics and provides detailed analysis of various subjects. Each section contains relevant information that contributes to the overall understanding of the topic.';
      case 'Word':
        return 'Sample Word document content with formatted text. This document includes headings, bullet points, and detailed explanations. It represents a typical business or academic document structure with introduction, main content, and conclusion sections.';
      case 'Excel':
        return 'Spreadsheet data summary: Contains numerical data, calculations, and tabular information. Includes multiple worksheets with financial or analytical data. Data is organized in rows and columns with headers and formulas.';
      case 'PowerPoint':
        return 'Presentation slides content: Introduction slide with overview, key points and supporting details, visual elements and structured information for presentation purposes, and conclusion with action items.';
      case 'Text':
      case 'Markdown':
        return 'Plain text document content with line breaks and paragraphs. Contains readable text without complex formatting but with clear structure and organization.';
      case 'CSV':
        return 'Comma-separated values data: Name,Age,Department\\nJohn Doe,30,Engineering\\nJane Smith,25,Marketing\\nBob Johnson,35,Sales';
      case 'JSON':
        return '{"document": {"title": "Sample Document", "author": "User", "content": "This is sample JSON content with structured data"}}';
      default:
        return 'Document content extracted successfully. Contains textual information that has been processed and analyzed for key insights and structure.';
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
  }

  private estimatePageCount(text: string): number {
    // Rough estimation: ~500 words per page
    const wordCount = this.countWords(text);
    return Math.max(1, Math.ceil(wordCount / 500));
  }

  private addSimulatedFormatting(plainText: string): string {
    // Add some simulated markdown formatting
    const sentences = plainText.split('. ');
    let formattedText = sentences[0] + '.'; // First sentence as is
    
    if (sentences.length > 1) {
      formattedText += '\n\n## ' + sentences[1] + '.'; // Second as heading
    }
    
    if (sentences.length > 2) {
      formattedText += '\n\n' + sentences.slice(2).join('. ') + '.';
    }
    
    // Add some bold and italic formatting
    formattedText = formattedText.replace(/important/gi, '**important**');
    formattedText = formattedText.replace(/analysis/gi, '*analysis*');
    
    return formattedText;
  }

  private extractBoldText(formattedText: string): string[] {
    const boldMatches = formattedText.match(/\*\*(.*?)\*\*/g);
    return boldMatches ? boldMatches.map(match => match.replace(/\*\*/g, '')) : [];
  }

  private extractItalicText(formattedText: string): string[] {
    const italicMatches = formattedText.match(/\*(.*?)\*/g);
    return italicMatches ? italicMatches.map(match => match.replace(/\*/g, '')) : [];
  }

  private extractHeadings(formattedText: string): string[] {
    const headingMatches = formattedText.match(/^#+\s(.+)$/gm);
    return headingMatches ? headingMatches.map(match => match.replace(/^#+\s/, '')) : [];
  }
}
