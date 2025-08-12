// TASK-031: Add real-time streaming backbone for live interactions

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getEnvAsBoolean, getEnvAsNumber, getEnvAsString } from '../utils/env.js';
import { z } from 'zod';
import { EventEmitter } from 'events';

// Streaming event schemas
const StreamingMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'audio', 'image', 'video', 'data', 'command', 'status', 'error']),
  content: z.unknown(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
  userId: z.string(),
  channelId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  ttl: z.number().optional(), // Time to live in milliseconds
  requires_ack: z.boolean().default(false)
});

const StreamingChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['public', 'private', 'direct', 'group', 'broadcast']),
  participants: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.date().default(() => new Date()),
  max_participants: z.number().optional(),
  message_retention: z.number().default(24 * 60 * 60 * 1000), // 24 hours
  rate_limit: z.object({
    messages_per_minute: z.number().default(60),
    burst_limit: z.number().default(10)
  }).optional()
});

const UserSessionSchema = z.object({
  userId: z.string(),
  socketId: z.string(),
  connected_at: z.date().default(() => new Date()),
  last_activity: z.date().default(() => new Date()),
  metadata: z.record(z.unknown()).optional(),
  subscribed_channels: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default(['read']),
  rate_limit_state: z.object({
    message_count: z.number().default(0),
    window_start: z.date().default(() => new Date())
  }).optional()
});

type StreamingMessage = z.infer<typeof StreamingMessageSchema>;
type StreamingChannel = z.infer<typeof StreamingChannelSchema>;
type UserSession = z.infer<typeof UserSessionSchema>;

interface StreamingMetrics {
  total_connections: number;
  active_channels: number;
  messages_per_second: number;
  total_messages: number;
  data_throughput_bytes: number;
  average_latency_ms: number;
  error_rate: number;
  uptime_seconds: number;
  memory_usage: {
    channels: number;
    sessions: number;
    message_queue: number;
  };
}

interface AIStreamingResponse {
  id: string;
  type: 'ai_response' | 'ai_thinking' | 'ai_error' | 'ai_complete';
  content: string;
  progress?: number; // 0-100
  chunk_index?: number;
  total_chunks?: number;
  model_used?: string;
  processing_time_ms?: number;
  confidence_score?: number;
  metadata?: Record<string, unknown>;
}

export class RealTimeStreamingService extends EventEmitter {
  private io: SocketIOServer | null = null;
  private httpServer: HTTPServer | null = null;
  private isInitialized = false;
  
  // Core data structures
  private channels: Map<string, StreamingChannel> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private messageQueue: Map<string, StreamingMessage[]> = new Map(); // channelId -> messages
  
  // Metrics and monitoring
  private metrics: StreamingMetrics = {
    total_connections: 0,
    active_channels: 0,
    messages_per_second: 0,
    total_messages: 0,
    data_throughput_bytes: 0,
    average_latency_ms: 0,
    error_rate: 0,
    uptime_seconds: 0,
    memory_usage: {
      channels: 0,
      sessions: 0,
      message_queue: 0
    }
  };
  
  private startTime = Date.now();
  private messageCounters: number[] = [];
  private latencyMeasurements: number[] = [];

  // Configuration
  private readonly MAX_CHANNELS: number;
  private readonly MAX_CONNECTIONS: number;
  private readonly MESSAGE_BUFFER_SIZE: number;
  private readonly HEARTBEAT_INTERVAL: number;
  private readonly CLEANUP_INTERVAL: number;

  constructor() {
    super();
    
    this.MAX_CHANNELS = getEnvAsNumber('STREAMING_MAX_CHANNELS', 1000);
    this.MAX_CONNECTIONS = getEnvAsNumber('STREAMING_MAX_CONNECTIONS', 10000);
    this.MESSAGE_BUFFER_SIZE = getEnvAsNumber('STREAMING_MESSAGE_BUFFER_SIZE', 100);
    this.HEARTBEAT_INTERVAL = getEnvAsNumber('STREAMING_HEARTBEAT_INTERVAL', 30000);
    this.CLEANUP_INTERVAL = getEnvAsNumber('STREAMING_CLEANUP_INTERVAL', 300000); // 5 minutes
  }

  async init(httpServer: HTTPServer): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.httpServer = httpServer;
      
      // Initialize Socket.IO
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e7, // 10MB
        allowRequest: this.authenticateConnection.bind(this)
      });

      // Set up event handlers
      this.setupSocketHandlers();
      
      // Start maintenance tasks
      this.startMaintenanceTasks();
      
      // Create default channels
      await this.createDefaultChannels();

      this.isInitialized = true;
      console.log('🌊 Real-time Streaming Service initialized');
      
    } catch (error) {
      console.error('Failed to initialize streaming service:', error);
      throw error;
    }
  }

  private async authenticateConnection(req: any, callback: (err: string | null | undefined, success: boolean) => void): Promise<void> {
    try {
      // Basic authentication check (in production, use proper JWT validation)
      const token = req.handshake?.auth?.token || req.handshake?.query?.token;
      
      if (!token) {
        callback('Authentication required', false);
        return;
      }

      // For now, accept any token that starts with 'user_'
      if (typeof token === 'string' && token.startsWith('user_')) {
        callback(null, true);
      } else {
        callback('Invalid token', false);
      }
    } catch (error) {
      callback('Authentication error', false);
    }
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.handleNewConnection(socket);
      
      socket.on('join_channel', (data) => this.handleJoinChannel(socket, data));
      socket.on('leave_channel', (data) => this.handleLeaveChannel(socket, data));
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      socket.on('ai_request', (data) => this.handleAIRequest(socket, data));
      socket.on('subscribe_to_ai', (data) => this.handleAISubscription(socket, data));
      socket.on('get_history', (data) => this.handleGetHistory(socket, data));
      socket.on('ping', (data) => this.handlePing(socket, data));
      
      socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));
      socket.on('error', (error) => this.handleSocketError(socket, error));
    });
  }

  private async handleNewConnection(socket: Socket): Promise<void> {
    try {
      const userId = this.extractUserIdFromSocket(socket);
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      // Check connection limits
      if (this.sessions.size >= this.MAX_CONNECTIONS) {
        socket.emit('error', { message: 'Connection limit reached' });
        socket.disconnect(true);
        return;
      }

      // Create user session
      const session: UserSession = {
        userId,
        socketId: socket.id,
        connected_at: new Date(),
        last_activity: new Date(),
        subscribed_channels: [],
        permissions: ['read', 'write'],
        metadata: {
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent']
        }
      };

      this.sessions.set(socket.id, session);
      
      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Update metrics
      this.metrics.total_connections++;

      // Join user to personal channel
      const personalChannelId = `user_${userId}`;
      await this.joinChannel(socket, personalChannelId, 'direct');

      // Send connection confirmation
      socket.emit('connected', {
        session_id: socket.id,
        user_id: userId,
        server_time: new Date().toISOString(),
        available_channels: Array.from(this.channels.keys()),
        permissions: session.permissions
      });

      console.log(`👤 User ${userId} connected with socket ${socket.id}`);
      this.emit('user_connected', { userId, socketId: socket.id });

    } catch (error) {
      console.error('Error handling new connection:', error);
      socket.emit('error', { message: 'Connection setup failed' });
      socket.disconnect(true);
    }
  }

  private async handleJoinChannel(socket: Socket, data: any): Promise<void> {
    try {
      const { channelId, channelType } = data;
      const session = this.sessions.get(socket.id);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      await this.joinChannel(socket, channelId, channelType || 'public');
      
    } catch (error) {
      console.error('Error joining channel:', error);
      socket.emit('error', { message: 'Failed to join channel' });
    }
  }

  private async handleLeaveChannel(socket: Socket, data: any): Promise<void> {
    try {
      const { channelId } = data;
      await this.leaveChannel(socket, channelId);
      
    } catch (error) {
      console.error('Error leaving channel:', error);
      socket.emit('error', { message: 'Failed to leave channel' });
    }
  }

  private async handleSendMessage(socket: Socket, data: any): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Check rate limiting
      if (!this.checkRateLimit(session)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Validate message
      const message = StreamingMessageSchema.parse({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        userId: session.userId,
        timestamp: new Date()
      });

      await this.broadcastMessage(message);
      
      // Send acknowledgment if required
      if (message.requires_ack) {
        socket.emit('message_ack', { message_id: message.id, status: 'delivered' });
      }

      // Update session activity
      session.last_activity = new Date();

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleAIRequest(socket: Socket, data: any): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const { query, options = {} } = data;
      const requestId = `ai_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send thinking status
      socket.emit('ai_response', {
        id: requestId,
        type: 'ai_thinking',
        content: 'Processing your request...',
        progress: 0
      } as AIStreamingResponse);

      // Simulate AI processing with streaming updates
      await this.streamAIResponse(socket, requestId, query, options);

    } catch (error) {
      console.error('Error handling AI request:', error);
      socket.emit('ai_response', {
        id: `error_${Date.now()}`,
        type: 'ai_error',
        content: 'AI request processing failed'
      } as AIStreamingResponse);
    }
  }

  private async handleAISubscription(socket: Socket, data: any): Promise<void> {
    try {
      const { subscribe, ai_channels = [] } = data;
      
      if (subscribe) {
        // Subscribe to AI-specific channels
        for (const channelId of ai_channels) {
          await this.joinChannel(socket, `ai_${channelId}`, 'broadcast');
        }
        socket.emit('ai_subscription', { status: 'subscribed', channels: ai_channels });
      } else {
        // Unsubscribe from AI channels
        for (const channelId of ai_channels) {
          await this.leaveChannel(socket, `ai_${channelId}`);
        }
        socket.emit('ai_subscription', { status: 'unsubscribed', channels: ai_channels });
      }

    } catch (error) {
      console.error('Error handling AI subscription:', error);
      socket.emit('error', { message: 'AI subscription failed' });
    }
  }

  private async handleGetHistory(socket: Socket, data: any): Promise<void> {
    try {
      const { channelId, limit = 50, before } = data;
      const session = this.sessions.get(socket.id);
      
      if (!session || !session.subscribed_channels.includes(channelId)) {
        socket.emit('error', { message: 'Not authorized for this channel' });
        return;
      }

      const messages = this.getChannelHistory(channelId, limit, before);
      socket.emit('channel_history', {
        channel_id: channelId,
        messages,
        count: messages.length
      });

    } catch (error) {
      console.error('Error getting history:', error);
      socket.emit('error', { message: 'Failed to get history' });
    }
  }

  private handlePing(socket: Socket, data: any): void {
    const session = this.sessions.get(socket.id);
    if (session) {
      session.last_activity = new Date();
      socket.emit('pong', { 
        timestamp: Date.now(), 
        server_time: new Date().toISOString() 
      });
    }
  }

  private async handleDisconnection(socket: Socket, reason: string): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (session) {
        // Remove from user sockets
        const userSockets = this.userSockets.get(session.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(session.userId);
          }
        }

        // Leave all channels
        for (const channelId of session.subscribed_channels) {
          await this.leaveChannel(socket, channelId, false);
        }

        // Remove session
        this.sessions.delete(socket.id);
        
        console.log(`👋 User ${session.userId} disconnected: ${reason}`);
        this.emit('user_disconnected', { userId: session.userId, socketId: socket.id, reason });
      }

    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  private handleSocketError(socket: Socket, error: any): void {
    console.error(`Socket error for ${socket.id}:`, error);
    this.metrics.error_rate += 1;
    this.emit('socket_error', { socketId: socket.id, error });
  }

  private async joinChannel(socket: Socket, channelId: string, channelType: StreamingChannel['type'] = 'public'): Promise<void> {
    try {
      // Create channel if it doesn't exist
      if (!this.channels.has(channelId)) {
        if (this.channels.size >= this.MAX_CHANNELS) {
          throw new Error('Maximum number of channels reached');
        }

        const newChannel: StreamingChannel = {
          id: channelId,
          name: channelId,
          type: channelType,
          participants: [],
          created_at: new Date(),
          max_participants: channelType === 'direct' ? 2 : undefined
        };

        this.channels.set(channelId, newChannel);
        this.messageQueue.set(channelId, []);
        this.metrics.active_channels++;
      }

      const channel = this.channels.get(channelId)!;
      const session = this.sessions.get(socket.id)!;

      // Check channel capacity
      if (channel.max_participants && channel.participants.length >= channel.max_participants) {
        throw new Error('Channel is full');
      }

      // Join socket to room
      socket.join(channelId);
      
      // Update channel participants
      if (!channel.participants.includes(session.userId)) {
        channel.participants.push(session.userId);
      }

      // Update session
      if (!session.subscribed_channels.includes(channelId)) {
        session.subscribed_channels.push(channelId);
      }

      // Notify channel
      socket.to(channelId).emit('user_joined', {
        channel_id: channelId,
        user_id: session.userId,
        participant_count: channel.participants.length
      });

      socket.emit('channel_joined', {
        channel_id: channelId,
        channel_type: channel.type,
        participant_count: channel.participants.length
      });

      console.log(`🔗 User ${session.userId} joined channel ${channelId}`);

    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  private async leaveChannel(socket: Socket, channelId: string, notify: boolean = true): Promise<void> {
    try {
      const channel = this.channels.get(channelId);
      const session = this.sessions.get(socket.id);
      
      if (!channel || !session) return;

      // Leave socket room
      socket.leave(channelId);

      // Update channel participants
      channel.participants = channel.participants.filter(id => id !== session.userId);

      // Update session
      session.subscribed_channels = session.subscribed_channels.filter(id => id !== channelId);

      // Notify channel if requested
      if (notify) {
        socket.to(channelId).emit('user_left', {
          channel_id: channelId,
          user_id: session.userId,
          participant_count: channel.participants.length
        });

        socket.emit('channel_left', { channel_id: channelId });
      }

      // Clean up empty channels (except system channels)
      if (channel.participants.length === 0 && !channelId.startsWith('system_')) {
        this.channels.delete(channelId);
        this.messageQueue.delete(channelId);
        this.metrics.active_channels--;
      }

    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }

  private async broadcastMessage(message: StreamingMessage): Promise<void> {
    try {
      const channelId = message.channelId;
      if (!channelId) {
        throw new Error('Message must have a channel ID');
      }

      // Store message in history
      this.storeMessage(channelId, message);

      // Broadcast to channel
      this.io?.to(channelId).emit('message', message);

      // Update metrics
      this.metrics.total_messages++;
      this.metrics.data_throughput_bytes += JSON.stringify(message).length;

      // Handle TTL if specified
      if (message.ttl) {
        setTimeout(() => {
          this.removeMessage(channelId, message.id);
        }, message.ttl);
      }

      this.emit('message_broadcast', message);

    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw error;
    }
  }

  private async streamAIResponse(socket: Socket, requestId: string, query: string, options: any): Promise<void> {
    try {
      // Simulate AI processing with progressive updates
      const chunks = [
        'I understand you want to know about',
        'this topic. Let me think about it...',
        'Here are some key points to consider:',
        '1. First, we should examine the context',
        '2. Then we can analyze the implications',
        '3. Finally, I can provide recommendations',
        'Based on my analysis, I recommend...'
      ];

      for (let i = 0; i < chunks.length; i++) {
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        
        socket.emit('ai_response', {
          id: requestId,
          type: 'ai_response',
          content: chunks[i],
          progress,
          chunk_index: i,
          total_chunks: chunks.length,
          model_used: 'gpt-4o',
          processing_time_ms: 150
        } as AIStreamingResponse);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      }

      // Send completion
      socket.emit('ai_response', {
        id: requestId,
        type: 'ai_complete',
        content: 'AI response completed successfully',
        progress: 100,
        model_used: 'gpt-4o',
        processing_time_ms: chunks.length * 250,
        confidence_score: 0.87
      } as AIStreamingResponse);

    } catch (error) {
      console.error('Error streaming AI response:', error);
      socket.emit('ai_response', {
        id: requestId,
        type: 'ai_error',
        content: 'AI processing failed'
      } as AIStreamingResponse);
    }
  }

  private storeMessage(channelId: string, message: StreamingMessage): void {
    const messages = this.messageQueue.get(channelId) || [];
    messages.push(message);
    
    // Maintain buffer size
    if (messages.length > this.MESSAGE_BUFFER_SIZE) {
      messages.shift();
    }
    
    this.messageQueue.set(channelId, messages);
  }

  private removeMessage(channelId: string, messageId: string): void {
    const messages = this.messageQueue.get(channelId) || [];
    const filtered = messages.filter(msg => msg.id !== messageId);
    this.messageQueue.set(channelId, filtered);
  }

  private getChannelHistory(channelId: string, limit: number, before?: string): StreamingMessage[] {
    const messages = this.messageQueue.get(channelId) || [];
    
    let filtered = messages;
    if (before) {
      const beforeTime = new Date(before);
      filtered = messages.filter(msg => msg.timestamp < beforeTime);
    }
    
    return filtered.slice(-limit);
  }

  private checkRateLimit(session: UserSession): boolean {
    const now = new Date();
    const windowStart = session.rate_limit_state?.window_start || now;
    const messageCount = session.rate_limit_state?.message_count || 0;
    
    // Reset window if needed (1 minute windows)
    if (now.getTime() - windowStart.getTime() > 60000) {
      session.rate_limit_state = {
        message_count: 1,
        window_start: now
      };
      return true;
    }
    
    // Check limit
    if (messageCount >= 60) { // 60 messages per minute
      return false;
    }
    
    // Increment counter
    session.rate_limit_state = {
      message_count: messageCount + 1,
      window_start: windowStart
    };
    
    return true;
  }

  private extractUserIdFromSocket(socket: Socket): string | null {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (typeof token === 'string' && token.startsWith('user_')) {
      return token.substring(5); // Remove 'user_' prefix
    }
    return null;
  }

  private async createDefaultChannels(): Promise<void> {
    const defaultChannels = [
      { id: 'system_announcements', type: 'broadcast' as const, name: 'System Announcements' },
      { id: 'system_ai_global', type: 'broadcast' as const, name: 'Global AI Responses' },
      { id: 'general', type: 'public' as const, name: 'General Chat' }
    ];

    for (const channelConfig of defaultChannels) {
      const channel: StreamingChannel = {
        id: channelConfig.id,
        name: channelConfig.name,
        type: channelConfig.type,
        participants: [],
        created_at: new Date()
      };

      this.channels.set(channel.id, channel);
      this.messageQueue.set(channel.id, []);
    }

    this.metrics.active_channels = this.channels.size;
  }

  private startMaintenanceTasks(): void {
    // Heartbeat and cleanup
    setInterval(() => {
      this.performMaintenance();
    }, this.CLEANUP_INTERVAL);

    // Metrics update
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  private performMaintenance(): void {
    const now = Date.now();
    
    // Clean up inactive sessions
    for (const [socketId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.last_activity.getTime();
      if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
        const socket = this.io?.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }

    // Clean up old messages
    for (const [channelId, messages] of this.messageQueue.entries()) {
      const channel = this.channels.get(channelId);
      if (channel?.message_retention) {
        const cutoff = now - channel.message_retention;
        const filtered = messages.filter(msg => msg.timestamp.getTime() > cutoff);
        this.messageQueue.set(channelId, filtered);
      }
    }

    console.log('🧹 Streaming service maintenance completed');
  }

  private updateMetrics(): void {
    // Calculate messages per second
    const currentTime = Date.now();
    this.messageCounters.push(this.metrics.total_messages);
    
    // Keep only last minute of data
    while (this.messageCounters.length > 60) {
      this.messageCounters.shift();
    }
    
    if (this.messageCounters.length > 1) {
      const messagesInWindow = this.messageCounters[this.messageCounters.length - 1] - this.messageCounters[0];
      this.metrics.messages_per_second = messagesInWindow / this.messageCounters.length;
    }

    // Update other metrics
    this.metrics.uptime_seconds = Math.floor((currentTime - this.startTime) / 1000);
    this.metrics.memory_usage = {
      channels: this.channels.size,
      sessions: this.sessions.size,
      message_queue: Array.from(this.messageQueue.values()).reduce((total, msgs) => total + msgs.length, 0)
    };

    // Calculate average latency (placeholder)
    if (this.latencyMeasurements.length > 0) {
      this.metrics.average_latency_ms = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    }
  }

  // Public API methods
  async broadcastToChannel(channelId: string, message: Omit<StreamingMessage, 'id' | 'timestamp' | 'userId'>): Promise<void> {
    const fullMessage: StreamingMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: 'system',
      ...message,
      channelId
    };

    await this.broadcastMessage(fullMessage);
  }

  async sendToUser(userId: string, message: Omit<StreamingMessage, 'id' | 'timestamp' | 'userId' | 'channelId'>): Promise<void> {
    const userSockets = this.userSockets.get(userId);
    if (!userSockets || userSockets.size === 0) {
      throw new Error(`User ${userId} is not connected`);
    }

    const personalChannelId = `user_${userId}`;
    const fullMessage: StreamingMessage = {
      id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: 'system',
      channelId: personalChannelId,
      ...message
    };

    await this.broadcastMessage(fullMessage);
  }

  getMetrics(): StreamingMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getActiveChannels(): StreamingChannel[] {
    return Array.from(this.channels.values());
  }

  getActiveSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  getChannelParticipants(channelId: string): string[] {
    const channel = this.channels.get(channelId);
    return channel?.participants || [];
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  async shutdown(): Promise<void> {
    try {
      if (this.io) {
        this.io.close();
      }
      
      this.channels.clear();
      this.sessions.clear();
      this.userSockets.clear();
      this.messageQueue.clear();
      
      console.log('🔌 Real-time Streaming Service shutdown complete');
      
    } catch (error) {
      console.error('Error during streaming service shutdown:', error);
    }
  }
}

export const realTimeStreamingService = new RealTimeStreamingService();