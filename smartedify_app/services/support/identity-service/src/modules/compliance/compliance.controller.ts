import { Controller, Post, Delete, Body, UseGuards, NotImplementedException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { MfaGuard } from '../mfa/guards/mfa.guard';

@Controller()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('privacy/export')
  @UseGuards(MfaGuard)
  async exportData(@Body('user_id') userId: string) {
    const jobId = await this.complianceService.exportData(userId);
    return { jobId };
  }

  @Delete('privacy/data')
  @UseGuards(MfaGuard)
  async deleteData(@Body('user_id') userId: string) {
    const jobId = await this.complianceService.deleteData(userId);
    return { jobId };
  }

  @Post('compliance/incidents')
  async reportIncident(@Body() incident: any) {
    // TODO: Implement incident reporting logic.
    throw new NotImplementedException('Incident reporting not implemented.');
  }
}
