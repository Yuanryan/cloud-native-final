import { Module } from '@nestjs/common';
import { SafetyReportsService } from './safety-reports.service';
import { SafetyReportsController } from './safety-reports.controller';
import { ScopeModule } from '../scope/scope.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ScopeModule, AuditModule],
  controllers: [SafetyReportsController],
  providers: [SafetyReportsService],
})
export class SafetyReportsModule {}
