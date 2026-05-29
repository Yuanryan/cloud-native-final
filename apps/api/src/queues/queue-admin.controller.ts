import { Controller, ForbiddenException, Get, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SAFETY_REPORTS_QUEUE } from './queue-names';
import { MetricsService } from '../metrics/metrics.service';
import { MetricsAggregatorService } from './metrics-aggregator.service';

const EMPTY_COUNTS = {
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
  paused: 0,
};

@SkipThrottle({ global: true })
@Controller('admin/queues')
export class QueueAdminController {
  constructor(
    @InjectQueue(SAFETY_REPORTS_QUEUE)
    private readonly queue: Queue,
    private readonly metrics: MetricsService,
    private readonly aggregator: MetricsAggregatorService,
  ) {}

  @Roles(Role.ADMIN)
  @Get('stats')
  async stats() {
    // Queue stats are Redis-backed → globally accurate across Pods. No fan-out
    // needed; per-Pod prom-client metrics are the only ones requiring aggregation.
    if (typeof (this.queue as Queue).getJobCounts !== 'function') {
      return {
        queue: SAFETY_REPORTS_QUEUE,
        enabled: false,
        counts: EMPTY_COUNTS,
      };
    }
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    return {
      queue: SAFETY_REPORTS_QUEUE,
      enabled: true,
      counts: { ...EMPTY_COUNTS, ...counts },
    };
  }

  @Roles(Role.ADMIN)
  @Get('metrics-summary')
  metricsSummary() {
    return this.metrics.summary();
  }

  @Roles(Role.ADMIN)
  @Get('metrics-summary-aggregated')
  metricsSummaryAggregated() {
    return this.aggregator.aggregate();
  }

  // Pod-to-Pod internal endpoint. Bypasses JWT but requires a shared secret
  // header. Only callable cluster-internally via the api-internal headless
  // Service; LB exposure is acceptable because of the token check.
  @Public()
  @Get('metrics-summary-internal')
  metricsSummaryInternal(@Headers('x-internal-token') token: string) {
    const expected = process.env.INTERNAL_API_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException('invalid internal token');
    }
    return this.metrics.summary();
  }
}
