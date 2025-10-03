import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ModerationService } from './moderation.service';
import { OnEvent } from '@nestjs/event-emitter';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  isModerator?: boolean;
}

@WebSocketGateway({
  namespace: '/moderation',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class ModerationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ModerationGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly moderationService: ModerationService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Moderation WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract and validate token from query or headers
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      const sessionId = client.handshake.query?.sessionId as string;

      if (!token || !sessionId) {
        this.logger.warn('Client connection rejected: missing token or sessionId');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      
      client.userId = payload.sub;
      client.tenantId = payload.tenantId;
      client.sessionId = sessionId;
      client.isModerator = payload.roles?.includes('moderator') || false;

      // Join session room
      await client.join(`session:${sessionId}`);
      
      // Join moderator room if applicable
      if (client.isModerator) {
        await client.join(`moderators:${sessionId}`);
      }

      this.connectedClients.set(client.id, client);

      this.logger.log(`Client connected: ${client.userId} to session ${sessionId} (moderator: ${client.isModerator})`);

      // Send current session state
      await this.sendSessionState(client);

    } catch (error) {
      this.logger.error('Client authentication failed', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.userId}`);
  }

  @SubscribeMessage('request_speech')
  async handleSpeechRequest(
    @MessageBody() data: { message?: string; priority?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.sessionId || !client.userId || !client.tenantId) {
        return { error: 'Invalid client state' };
      }

      const request = await this.moderationService.requestSpeech(
        client.sessionId,
        {
          message: data.message,
          priority: data.priority as any || 'normal',
        },
        client.tenantId,
        client.userId,
      );

      // Notify moderators
      this.server.to(`moderators:${client.sessionId}`).emit('speech_request_received', {
        requestId: request.id,
        userId: client.userId,
        message: request.message,
        priority: request.priority,
        requestedAt: request.requestedAt,
      });

      return { success: true, requestId: request.id };
    } catch (error) {
      this.logger.error('Error handling speech request', error.message);
      return { error: error.message };
    }
  }

  @SubscribeMessage('approve_speech')
  async handleApproveSpeech(
    @MessageBody() data: { requestId: string; notes?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.isModerator) {
        return { error: 'Moderator privileges required' };
      }

      const request = await this.moderationService.approveSpeechRequest(
        data.requestId,
        client.tenantId,
        client.userId,
        data.notes,
      );

      // Notify the requester
      this.server.to(`session:${client.sessionId}`).emit('speech_approved', {
        requestId: request.id,
        userId: request.userId,
        moderatorId: client.userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error approving speech request', error.message);
      return { error: error.message };
    }
  }

  @SubscribeMessage('deny_speech')
  async handleDenySpeech(
    @MessageBody() data: { requestId: string; reason?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.isModerator) {
        return { error: 'Moderator privileges required' };
      }

      const request = await this.moderationService.denySpeechRequest(
        data.requestId,
        client.tenantId,
        client.userId,
        data.reason,
      );

      // Notify the requester
      this.server.to(`session:${client.sessionId}`).emit('speech_denied', {
        requestId: request.id,
        userId: request.userId,
        moderatorId: client.userId,
        reason: data.reason,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error denying speech request', error.message);
      return { error: error.message };
    }
  }

  @SubscribeMessage('mute_user')
  async handleMuteUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.isModerator) {
        return { error: 'Moderator privileges required' };
      }

      await this.moderationService.muteUser(
        client.sessionId,
        data.userId,
        client.tenantId,
        client.userId,
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Error muting user', error.message);
      return { error: error.message };
    }
  }

  @SubscribeMessage('unmute_user')
  async handleUnmuteUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.isModerator) {
        return { error: 'Moderator privileges required' };
      }

      await this.moderationService.unmuteUser(
        client.sessionId,
        data.userId,
        client.tenantId,
        client.userId,
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Error unmuting user', error.message);
      return { error: error.message };
    }
  }

  // Event listeners for broadcasting updates
  @OnEvent('speech.requested')
  handleSpeechRequested(payload: any) {
    this.server.to(`moderators:${payload.sessionId}`).emit('speech_request_received', payload);
  }

  @OnEvent('speech.approved')
  handleSpeechApproved(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('speech_approved', payload);
  }

  @OnEvent('speech.denied')
  handleSpeechDenied(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('speech_denied', payload);
  }

  @OnEvent('user.muted')
  handleUserMuted(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('user_muted', payload);
  }

  @OnEvent('user.unmuted')
  handleUserUnmuted(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('user_unmuted', payload);
  }

  @OnEvent('transcript.chunk')
  handleTranscriptChunk(payload: any) {
    this.server.to(`session:${payload.sessionId}`).emit('transcript_chunk', payload);
  }

  private async sendSessionState(client: AuthenticatedSocket) {
    try {
      const speechRequests = await this.moderationService.getSessionSpeechRequests(
        client.sessionId,
        client.tenantId,
      );

      client.emit('session_state', {
        sessionId: client.sessionId,
        speechRequests: speechRequests.map(req => ({
          id: req.id,
          userId: req.userId,
          message: req.message,
          priority: req.priority,
          status: req.status,
          requestedAt: req.requestedAt,
        })),
      });
    } catch (error) {
      this.logger.error('Error sending session state', error.message);
    }
  }
}