import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as client from 'prom-client';
import { SafetyReportsService } from './safety-reports.service';
import { SAFETY_REPORTS_QUEUE } from '../queues/queue-names';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { SubmitSafetyReportDto } from './dto/submit-safety-report.dto';

// Lifetime counter for jobs the worker actually finished, independent of
// BullMQ's removeOnComplete retention policy. Exposed via /metrics.
const jobsProcessed = new client.Counter({
  name: 'safety_reports_jobs_processed_total',
  help: 'Total safety-report jobs processed by this worker since boot',
  labelNames: ['outcome'],
});

export interface SubmitReportJob {
  eventId: string;
  actor: AuthUser;
  dto: SubmitSafetyReportDto;
}

// NOTE: For production, deploy this processor as a separate worker Deployment
// (with its own image command pointing at a worker entrypoint) to enable
// independent scaling and fault isolation from the HTTP API.
@Processor(SAFETY_REPORTS_QUEUE)
export class SafetyReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(SafetyReportsProcessor.name);

  constructor(private readonly reports: SafetyReportsService) {
    super();
  }

  async process(job: Job<SubmitReportJob>) {
    if (job.name === 'submit') {
      this.logger.log(
        `Processing submit job ${job.id} for event ${job.data.eventId}`,
      );
      try {
        const result = await this.reports.submit(
          job.data.eventId,
          job.data.actor,
          job.data.dto,
        );
        jobsProcessed.inc({ outcome: 'success' });
        return result;
      } catch (err) {
        jobsProcessed.inc({ outcome: 'failure' });
        throw err;
      }
    }
    throw new Error(`Unknown job name: ${job.name}`);
  }
}
