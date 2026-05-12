import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SafetyStatus } from '@prisma/client';

export class SubmitSafetyReportDto {
  @IsEnum(SafetyStatus)
  status!: SafetyStatus;

  @IsOptional()
  @IsString()
  message?: string;
}
