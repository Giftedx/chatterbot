/**
 * Speaker Detection Service
 * Handles speaker identification and diarization
 */

import type { MediaFile, TranscriptionSegment, DetectedSpeaker, SpeakerSegment } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for speaker detection and diarization
 */
export class SpeakerDetectionService {
  private readonly maxSpeakers = 10;
  private readonly minSegmentDuration = 0.5; // seconds

  /**
   * Perform speaker detection on transcribed audio
   */
  public async performSpeakerDetection(
    mediaFile: MediaFile, 
    transcription: { segments: TranscriptionSegment[] }
  ) {
    try {
      logger.info('Starting speaker detection', {
        operation: 'speaker-detection',
        metadata: {
          fileId: mediaFile.id,
          segmentCount: transcription.segments.length
        }
      });

      // Mock speaker detection - in real implementation would use services like:
      // - Azure Cognitive Services Speaker Recognition
      // - Google Cloud Speaker Diarization
      // - Amazon Transcribe Speaker Identification
      // - Pyannote.audio
      // - AssemblyAI Speaker Diarization

      const speakerResults = await this.mockSpeakerDetection(transcription.segments);

      logger.info('Speaker detection completed', {
        operation: 'speaker-detection',
        metadata: {
          fileId: mediaFile.id,
          speakerCount: speakerResults.speakerCount,
          identifiedSpeakers: speakerResults.speakers.length
        }
      });

      return speakerResults;

    } catch (error) {
      logger.error('Speaker detection failed', {
        operation: 'speaker-detection',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Mock speaker detection for development/testing
   */
  private async mockSpeakerDetection(segments: TranscriptionSegment[]) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Determine number of speakers based on content length and randomization
    const speakerCount = Math.min(
      this.maxSpeakers,
      Math.max(1, Math.floor(segments.length / 8) + Math.floor(Math.random() * 3))
    );

    const speakers = this.generateMockSpeakers(speakerCount);
    const speakerSegments = this.assignSpeakersToSegments(segments, speakers);

    return {
      speakerCount,
      speakers,
      segments: speakerSegments,
      confidence: 0.75 + Math.random() * 0.20 // 75-95% confidence
    };
  }

  /**
   * Generate mock speakers aligned with base type structure
   */
  private generateMockSpeakers(count: number): DetectedSpeaker[] {
    const speakers: DetectedSpeaker[] = [];
    
    for (let i = 0; i < count; i++) {
      speakers.push({
        id: `speaker_${i + 1}`,
        confidence: 0.70 + Math.random() * 0.25, // 70-95% confidence
        segments: []
      });
    }

    return speakers;
  }

  /**
   * Assign speakers to transcription segments
   */
  private assignSpeakersToSegments(
    segments: TranscriptionSegment[], 
    speakers: DetectedSpeaker[]
  ): Array<TranscriptionSegment & { speakerId: string }> {
    const speakerSegments = [];
    let currentSpeakerIndex = 0;
    let segmentsSinceChange = 0;

    for (const segment of segments) {
      // Randomly change speakers every 3-8 segments
      if (segmentsSinceChange > 3 && Math.random() > 0.7) {
        currentSpeakerIndex = (currentSpeakerIndex + 1) % speakers.length;
        segmentsSinceChange = 0;
      }

      const currentSpeaker = speakers[currentSpeakerIndex];
      const speakingTime = segment.endTime - segment.startTime;

      // Add segment to speaker's segments
      currentSpeaker.segments.push({
        startTime: segment.startTime,
        endTime: segment.endTime,
        confidence: currentSpeaker.confidence
      });

      speakerSegments.push({
        ...segment,
        speakerId: currentSpeaker.id
      });

      segmentsSinceChange++;
    }

    return speakerSegments;
  }

  /**
   * Analyze speaking patterns
   */
  public analyzeSpeakingPatterns(
    speakers: DetectedSpeaker[],
    segments: Array<TranscriptionSegment & { speakerId: string }>
  ) {
    const patterns = {
      dominantSpeaker: this.findDominantSpeaker(speakers),
      speakingTimeDistribution: this.calculateSpeakingTimeDistribution(speakers),
      turnTaking: this.analyzeTurnTaking(segments),
      interactionStyle: this.determineInteractionStyle(speakers, segments)
    };

    return patterns;
  }

  /**
   * Find the speaker with the most speaking time
   */
  private findDominantSpeaker(speakers: DetectedSpeaker[]): DetectedSpeaker | null {
    if (speakers.length === 0) return null;

    return speakers.reduce((dominant, current) => {
      const currentTime = this.calculateSpeakerTime(current);
      const dominantTime = this.calculateSpeakerTime(dominant);
      return currentTime > dominantTime ? current : dominant;
    });
  }

  /**
   * Calculate total speaking time for a speaker
   */
  private calculateSpeakerTime(speaker: DetectedSpeaker): number {
    return speaker.segments.reduce((total, segment) => 
      total + (segment.endTime - segment.startTime), 0);
  }

  /**
   * Calculate speaking time distribution
   */
  private calculateSpeakingTimeDistribution(speakers: DetectedSpeaker[]) {
    const totalTime = speakers.reduce((sum, speaker) => 
      sum + this.calculateSpeakerTime(speaker), 0);
    
    return speakers.map(speaker => {
      const speakingTime = this.calculateSpeakerTime(speaker);
      return {
        speakerId: speaker.id,
        speakingTime: speakingTime,
        percentage: totalTime > 0 ? (speakingTime / totalTime) * 100 : 0
      };
    });
  }

  /**
   * Analyze turn-taking patterns
   */
  private analyzeTurnTaking(segments: Array<TranscriptionSegment & { speakerId: string }>) {
    if (segments.length < 2) {
      return { averageTurnDuration: 0, totalTurns: 0, turnChanges: 0 };
    }

    let turnChanges = 0;
    let currentSpeaker = segments[0].speakerId;
    const turnDurations = [];
    let currentTurnStart = segments[0].startTime;

    for (let i = 1; i < segments.length; i++) {
      if (segments[i].speakerId !== currentSpeaker) {
        // Speaker change detected
        turnChanges++;
        turnDurations.push(segments[i - 1].endTime - currentTurnStart);
        currentSpeaker = segments[i].speakerId;
        currentTurnStart = segments[i].startTime;
      }
    }

    // Add final turn
    if (segments.length > 0) {
      turnDurations.push(segments[segments.length - 1].endTime - currentTurnStart);
    }

    const averageTurnDuration = turnDurations.length > 0 
      ? turnDurations.reduce((a, b) => a + b, 0) / turnDurations.length 
      : 0;

    return {
      averageTurnDuration: Math.round(averageTurnDuration * 100) / 100,
      totalTurns: turnDurations.length,
      turnChanges
    };
  }

  /**
   * Determine interaction style based on speaking patterns
   */
  private determineInteractionStyle(
    speakers: DetectedSpeaker[],
    segments: Array<TranscriptionSegment & { speakerId: string }>
  ): string {
    if (speakers.length === 1) {
      return 'monologue';
    }

    const distribution = this.calculateSpeakingTimeDistribution(speakers);
    const dominantPercentage = Math.max(...distribution.map(d => d.percentage));

    if (dominantPercentage > 80) {
      return 'presentation';
    } else if (dominantPercentage > 60) {
      return 'interview';
    } else if (speakers.length === 2) {
      return 'conversation';
    } else {
      return 'group_discussion';
    }
  }

  /**
   * Generate speaker summary
   */
  public generateSpeakerSummary(speakerResults: {
    speakerCount: number;
    speakers: DetectedSpeaker[];
    segments: Array<TranscriptionSegment & { speakerId: string }>;
  }): string {
    const { speakerCount, speakers, segments } = speakerResults;
    
    if (speakerCount === 1) {
      return `Single speaker detected.`;
    }

    const patterns = this.analyzeSpeakingPatterns(speakers, segments);
    const dominant = patterns.dominantSpeaker;

    return `${speakerCount} speakers detected in ${patterns.interactionStyle} format. ` +
           `${dominant ? `Primary speaker: ${dominant.id} (${Math.round((this.calculateSpeakerTime(dominant) / speakers.reduce((sum, s) => sum + this.calculateSpeakerTime(s), 0)) * 100)}% speaking time)` : 'Equal participation'}.`;
  }
}
