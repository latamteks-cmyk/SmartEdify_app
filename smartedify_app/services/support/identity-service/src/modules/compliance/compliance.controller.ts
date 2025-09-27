import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { MfaGuard } from '../mfa/guards/mfa.guard'; // I will create this guard later

@Controller('privacy')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('export')
  @UseGuards(MfaGuard)
  async exportData(@Body('user_id') userId: string) {
    const jobId = await this.complianceService.exportData(userId);
    return { jobId };
  }

  @Delete('data')
  @UseGuards(MfaGuard)
  async deleteData(@Body('user_id') userId: string) {
    const jobId = await this.complianceService.deleteData(userId);
    return { jobId };
  }
}
