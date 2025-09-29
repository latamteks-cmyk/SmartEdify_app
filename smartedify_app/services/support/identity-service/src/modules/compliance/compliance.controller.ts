import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { MfaGuard } from '../mfa/guards/mfa.guard'; // I will create this guard later
import { RequestComplianceJobDto } from './dto/request-compliance-job.dto';
import { ComplianceJobCallbackDto } from './dto/compliance-job-callback.dto';

@Controller('privacy')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('export')
  @UseGuards(MfaGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async exportData(@Body() payload: RequestComplianceJobDto) {
    const job = await this.complianceService.exportData(payload);
    return { job_id: job.id, status: job.status };
  }

  @Delete('data')
  @UseGuards(MfaGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteData(@Body() payload: RequestComplianceJobDto) {
    const job = await this.complianceService.deleteData(payload);
    return { job_id: job.id, status: job.status };
  }

  @Post('jobs/:jobId/callbacks')
  @HttpCode(HttpStatus.ACCEPTED)
  async receiveCallback(
    @Param('jobId') jobId: string,
    @Body() callback: ComplianceJobCallbackDto,
  ) {
    const job = await this.complianceService.handleJobCallback(jobId, callback);
    return { job_id: job.id, status: job.status };
  }
}
