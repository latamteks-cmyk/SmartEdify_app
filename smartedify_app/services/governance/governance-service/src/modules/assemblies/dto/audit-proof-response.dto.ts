import { ApiProperty } from '@nestjs/swagger';

export class AuditProofResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Merkle root hash of the event stream',
    example: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  })
  merkleRoot: string;

  @ApiProperty({
    description: 'Commit height in the event stream',
    example: 1234,
  })
  commitHeight: number;

  @ApiProperty({
    description: 'Digital signature of the audit proof',
    example: 'signature_string_here',
  })
  signature: string;

  @ApiProperty({
    description: 'Key ID used for signing',
    example: 'tenant_key_id_123',
  })
  kid: string;

  @ApiProperty({
    description: 'JWKS URI for key verification',
    example: 'https://keys.smartedify.com/.well-known/jwks.json',
  })
  jwksUri: string;

  @ApiProperty({
    description: 'SHA256 hash of the recording file',
    example: 'recording_hash_sha256_string',
  })
  recordingHashSha256: string;

  @ApiProperty({
    description: 'Recording URL',
    example: 'https://recordings.smartedify.com/session_123.mp4',
  })
  recordingUrl: string;

  @ApiProperty({
    description: 'Timestamp when the proof was generated',
    example: '2025-03-15T14:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Assembly information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      code: 'ASM-2025-001',
      title: 'Asamblea Ordinaria Anual 2025',
    },
  })
  assembly: {
    id: string;
    code: string;
    title: string;
  };
}