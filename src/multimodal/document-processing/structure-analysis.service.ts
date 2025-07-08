/**
 * Structure Analysis Service
 * Analyzes document structure, sections, and organization
 */

import { MediaFile, DocumentSection, DocumentStructure, TextExtractionResult } from './types.js';
import { logger } from '../../utils/logger.js';

export class DocumentStructureAnalysisService {

  /**
   * Analyze document structure and organization
   */
  async analyzeDocumentStructure(
    mediaFile: MediaFile,
    textContent?: TextExtractionResult
  ): Promise<DocumentStructure | null> {
    try {
      if (!textContent || !textContent.fullText) {
        logger.warn('No text content available for structure analysis', {
          operation: 'structure-analysis',
          metadata: { fileId: mediaFile.id }
        });
        return null;
      }

      const sections = this.splitIntoSections(textContent.fullText);
      const headingLevels = this.detectHeadingLevels(textContent.fullText);
      const tableOfContents = this.generateTableOfContents(sections, textContent);
      const documentFlow = this.analyzeDocumentFlow(sections);

      const structure: DocumentStructure = {
        sections,
        headingLevels,
        tableOfContents,
        documentFlow
      };

      logger.info('Document structure analysis completed', {
        operation: 'structure-analysis',
        metadata: {
          fileId: mediaFile.id,
          sectionCount: sections.length,
          headingLevels: headingLevels.length,
          documentFlow
        }
      });

      return structure;

    } catch (error) {
      logger.error('Failed to analyze document structure', {
        operation: 'structure-analysis',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      return null;
    }
  }

  /**
   * Extract sections from text
   */
  extractSections(text: string, options: {
    minSectionLength?: number;
    sectionSeparator?: RegExp;
    includeHeadings?: boolean;
  } = {}): DocumentSection[] {
    const {
      minSectionLength = 50,
      sectionSeparator = /\n\n+/,
      includeHeadings = true
    } = options;

    try {
      const parts = text.split(sectionSeparator).filter(p => p.trim().length >= minSectionLength);
      
      return parts.map((content, index) => {
        const trimmedContent = content.trim();
        const title = includeHeadings ? this.extractSectionTitle(trimmedContent, index) : `Section ${index + 1}`;
        const level = this.determineSectionLevel(trimmedContent);
        const wordCount = this.countWords(trimmedContent);

        return {
          title,
          content: trimmedContent,
          level,
          wordCount
        };
      });

    } catch (error) {
      logger.error('Failed to extract sections', {
        operation: 'section-extraction',
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Detect heading hierarchy in document
   */
  detectHeadings(text: string): Array<{ text: string; level: number; position: number }> {
    try {
      const headings: Array<{ text: string; level: number; position: number }> = [];
      const lines = text.split('\n');

      lines.forEach((line, index) => {
        const heading = this.parseHeading(line.trim(), index);
        if (heading) {
          headings.push(heading);
        }
      });

      return headings;

    } catch (error) {
      logger.error('Failed to detect headings', {
        operation: 'heading-detection',
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Analyze document hierarchy and nesting
   */
  analyzeHierarchy(sections: DocumentSection[]): {
    maxDepth: number;
    hierarchyMap: Record<number, number[]>;
    parentChildRelations: Array<{ parent: number; children: number[] }>;
  } {
    try {
      const hierarchyMap: Record<number, number[]> = {};
      const parentChildRelations: Array<{ parent: number; children: number[] }> = [];
      let maxDepth = 0;

      // Group sections by level
      sections.forEach((section, index) => {
        const level = section.level;
        if (!hierarchyMap[level]) {
          hierarchyMap[level] = [];
        }
        hierarchyMap[level].push(index);
        maxDepth = Math.max(maxDepth, level);
      });

      // Find parent-child relationships
      for (let level = 1; level < maxDepth; level++) {
        const currentLevelSections = hierarchyMap[level] || [];
        const nextLevelSections = hierarchyMap[level + 1] || [];

        currentLevelSections.forEach(parentIndex => {
          const children = nextLevelSections.filter(childIndex => {
            // Child sections should come after parent in the document
            return childIndex > parentIndex && 
                   (!hierarchyMap[level].find(nextParent => nextParent > parentIndex && nextParent < childIndex));
          });

          if (children.length > 0) {
            parentChildRelations.push({ parent: parentIndex, children });
          }
        });
      }

      return { maxDepth, hierarchyMap, parentChildRelations };

    } catch (error) {
      logger.error('Failed to analyze hierarchy', {
        operation: 'hierarchy-analysis',
        error: String(error)
      });
      return { maxDepth: 1, hierarchyMap: {}, parentChildRelations: [] };
    }
  }

  /**
   * Generate document outline
   */
  generateOutline(structure: DocumentStructure): Array<{
    title: string;
    level: number;
    wordCount: number;
    subsections?: Array<{ title: string; level: number; wordCount: number }>;
  }> {
    try {
      const outline = structure.sections.map(section => ({
        title: section.title,
        level: section.level,
        wordCount: section.wordCount
      }));

      // Group subsections under main sections
      const groupedOutline: Array<{
        title: string;
        level: number;
        wordCount: number;
        subsections?: Array<{ title: string; level: number; wordCount: number }>;
      }> = [];

      let currentMainSection: any = null;

      outline.forEach(item => {
        if (item.level === 1) {
          if (currentMainSection) {
            groupedOutline.push(currentMainSection);
          }
          currentMainSection = { ...item, subsections: [] };
        } else if (currentMainSection && item.level > 1) {
          currentMainSection.subsections.push(item);
        }
      });

      if (currentMainSection) {
        groupedOutline.push(currentMainSection);
      }

      return groupedOutline;

    } catch (error) {
      logger.error('Failed to generate outline', {
        operation: 'outline-generation',
        error: String(error)
      });
      return [];
    }
  }

  // Private helper methods

  private splitIntoSections(text: string): DocumentSection[] {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((content, index) => ({
      title: index === 0 ? 'Introduction' : `Section ${index}`,
      content: content.trim(),
      level: 1,
      wordCount: this.countWords(content)
    }));
  }

  private detectHeadingLevels(text: string): number[] {
    const lines = text.split('\n');
    const headingPattern = /^#+\s/; // Markdown-style headings
    
    const levels = lines
      .filter(line => headingPattern.test(line))
      .map(line => (line.match(/^#+/) || [''])[0].length);
    
    return Array.from(new Set(levels)).sort();
  }

  private generateTableOfContents(
    sections: DocumentSection[],
    textContent: TextExtractionResult
  ): Array<{ title: string; level: number; page?: number }> {
    return sections.map((section, index) => ({
      title: section.title,
      level: section.level,
      page: textContent.pageCount ? Math.ceil((index + 1) * textContent.pageCount / sections.length) : undefined
    }));
  }

  private analyzeDocumentFlow(sections: DocumentSection[]): 'simple' | 'basic' | 'structured' | 'complex' {
    if (sections.length <= 1) return 'simple';
    if (sections.length <= 3) return 'basic';
    if (sections.length <= 6) return 'structured';
    return 'complex';
  }

  private extractSectionTitle(content: string, index: number): string {
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    
    // Check if first line looks like a heading
    if (firstLine.length < 100 && firstLine.length > 0) {
      // Remove markdown heading markers if present
      const cleanTitle = firstLine.replace(/^#+\s*/, '');
      if (cleanTitle.length > 0) {
        return cleanTitle;
      }
    }
    
    // Extract first few words as title
    const words = firstLine.split(/\s+/).slice(0, 5).join(' ');
    return words.length > 0 ? words + '...' : `Section ${index + 1}`;
  }

  private determineSectionLevel(content: string): number {
    const firstLine = content.split('\n')[0];
    const headingMatch = firstLine.match(/^(#+)\s/);
    
    if (headingMatch) {
      return headingMatch[1].length;
    }
    
    // Default level based on content characteristics
    if (content.length < 200) return 2; // Short sections are likely subsections
    return 1; // Default to main section
  }

  private parseHeading(line: string, position: number): { text: string; level: number; position: number } | null {
    // Markdown style headings
    const markdownMatch = line.match(/^(#+)\s+(.+)$/);
    if (markdownMatch) {
      return {
        text: markdownMatch[2].trim(),
        level: markdownMatch[1].length,
        position
      };
    }

    // Simple heuristic: lines that are short and don't end with punctuation might be headings
    if (line.length > 0 && line.length < 80 && !line.match(/[.!?]$/)) {
      // Check if line has title case or is all caps
      const isTitleCase = line.charAt(0) === line.charAt(0).toUpperCase();
      const isAllCaps = line === line.toUpperCase() && line.toLowerCase() !== line;
      
      if (isTitleCase || isAllCaps) {
        return {
          text: line,
          level: isAllCaps ? 1 : 2,
          position
        };
      }
    }

    return null;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
