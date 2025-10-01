import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VideoSessionConfig {
  assemblyId: string;
  tenantId: string;
  maxParticipants: number;
}

export interface VideoProvider {
  createSession(config: VideoSessionConfig): Promise<string>;
  endSession(sessionId: string): Promise<void>;
  getSessionInfo(sessionId: string): Promise<any>;
}

@Injectable()
export class VideoProvidersService {
  private readonly logger = new Logger(VideoProvidersService.name);
  private providers: Map<string, VideoProvider> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // WebRTC Provider (default)
    this.providers.set('webrtc', new WebRTCProvider(this.configService));
    
    // Google Meet Provider
    if (this.configService.get('GOOGLE_MEET_API_KEY')) {
      this.providers.set('google_meet', new GoogleMeetProvider(this.configService));
    }

    // Zoom Provider
    if (this.configService.get('ZOOM_API_KEY')) {
      this.providers.set('zoom', new ZoomProvider(this.configService));
    }
  }

  async createSession(providerName: string, config: VideoSessionConfig): Promise<string> {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new BadRequestException(`Video provider '${providerName}' not available`);
    }

    try {
      const sessionUrl = await provider.createSession(config);
      this.logger.log(`Video session created with ${providerName}: ${sessionUrl}`);
      return sessionUrl;
    } catch (error) {
      this.logger.error(`Failed to create session with ${providerName}`, error);
      throw error;
    }
  }

  async endSession(providerName: string, sessionId: string): Promise<void> {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      this.logger.warn(`Provider '${providerName}' not found for ending session ${sessionId}`);
      return;
    }

    try {
      await provider.endSession(sessionId);
      this.logger.log(`Video session ended with ${providerName}: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to end session with ${providerName}`, error);
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// WebRTC Provider Implementation
class WebRTCProvider implements VideoProvider {
  private readonly logger = new Logger(WebRTCProvider.name);

  constructor(private configService: ConfigService) {}

  async createSession(config: VideoSessionConfig): Promise<string> {
    // Generate a unique room ID
    const roomId = `assembly-${config.assemblyId}-${Date.now()}`;
    
    // In a real implementation, this would create a WebRTC room
    // For now, return a mock URL
    const baseUrl = this.configService.get('WEBRTC_BASE_URL', 'https://meet.smartedify.com');
    const sessionUrl = `${baseUrl}/room/${roomId}?maxParticipants=${config.maxParticipants}`;
    
    this.logger.debug(`WebRTC session created: ${sessionUrl}`);
    return sessionUrl;
  }

  async endSession(sessionId: string): Promise<void> {
    // In a real implementation, this would close the WebRTC room
    this.logger.debug(`WebRTC session ended: ${sessionId}`);
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    return {
      provider: 'webrtc',
      sessionId,
      status: 'active',
    };
  }
}

// Google Meet Provider Implementation
class GoogleMeetProvider implements VideoProvider {
  private readonly logger = new Logger(GoogleMeetProvider.name);

  constructor(private configService: ConfigService) {}

  async createSession(config: VideoSessionConfig): Promise<string> {
    // In a real implementation, this would use Google Meet API
    const meetingId = `assembly-${config.assemblyId}-${Date.now()}`;
    const sessionUrl = `https://meet.google.com/${meetingId}`;
    
    this.logger.debug(`Google Meet session created: ${sessionUrl}`);
    return sessionUrl;
  }

  async endSession(sessionId: string): Promise<void> {
    this.logger.debug(`Google Meet session ended: ${sessionId}`);
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    return {
      provider: 'google_meet',
      sessionId,
      status: 'active',
    };
  }
}

// Zoom Provider Implementation
class ZoomProvider implements VideoProvider {
  private readonly logger = new Logger(ZoomProvider.name);

  constructor(private configService: ConfigService) {}

  async createSession(config: VideoSessionConfig): Promise<string> {
    // In a real implementation, this would use Zoom API
    const meetingId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const sessionUrl = `https://zoom.us/j/${meetingId}`;
    
    this.logger.debug(`Zoom session created: ${sessionUrl}`);
    return sessionUrl;
  }

  async endSession(sessionId: string): Promise<void> {
    this.logger.debug(`Zoom session ended: ${sessionId}`);
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    return {
      provider: 'zoom',
      sessionId,
      status: 'active',
    };
  }
}