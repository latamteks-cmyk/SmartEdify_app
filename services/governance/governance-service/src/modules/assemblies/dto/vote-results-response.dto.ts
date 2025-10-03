import { ApiProperty } from '@nestjs/swagger';
import { ProposalStatus } from '../entities/proposal.entity';

export class VoteResultsResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  proposalId: string;

  @ApiProperty({
    description: 'Proposal title',
    example: 'Aprobación del presupuesto 2025',
  })
  title: string;

  @ApiProperty({
    description: 'Proposal status',
    enum: ProposalStatus,
    example: ProposalStatus.ACTIVE,
  })
  status: ProposalStatus;

  @ApiProperty({
    description: 'Total votes cast',
    example: 45.5,
  })
  totalVotes: number;

  @ApiProperty({
    description: 'Votes in favor',
    example: 30.2,
  })
  favorVotes: number;

  @ApiProperty({
    description: 'Votes against',
    example: 10.1,
  })
  againstVotes: number;

  @ApiProperty({
    description: 'Abstention votes',
    example: 5.2,
  })
  abstentionVotes: number;

  @ApiProperty({
    description: 'Participation percentage',
    example: 75.8,
  })
  participationPercentage: number;

  @ApiProperty({
    description: 'Approval percentage (favor votes / total votes)',
    example: 66.4,
  })
  approvalPercentage: number;

  @ApiProperty({
    description: 'Whether the proposal is approved',
    example: true,
  })
  isApproved: boolean;

  @ApiProperty({
    description: 'Whether quorum is achieved',
    example: true,
  })
  hasQuorum: boolean;

  @ApiProperty({
    description: 'Required quorum percentage',
    example: 50.0,
  })
  requiredQuorumPercentage: number;

  @ApiProperty({
    description: 'Required majority percentage',
    example: 60.0,
  })
  requiredMajorityPercentage: number;
}