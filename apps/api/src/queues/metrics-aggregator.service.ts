import { Injectable, Logger } from '@nestjs/common';
import { promises as dnsP } from 'dns';
import { MetricsService, MetricsSummary } from '../metrics/metrics.service';

export type AggregatedMetricsSummary = MetricsSummary & {
  pods: number;
  podNames: string[];
  aggregated: boolean;
  aggregationNote?: string;
};

const FETCH_TIMEOUT_MS = 2000;

@Injectable()
export class MetricsAggregatorService {
  private readonly logger = new Logger(MetricsAggregatorService.name);

  constructor(private readonly metrics: MetricsService) {}

  private get internalToken(): string | undefined {
    return process.env.INTERNAL_API_TOKEN || undefined;
  }

  private get discoveryHost(): string {
    return (
      process.env.INTERNAL_DISCOVERY_HOST ||
      'api-internal.safety-demo.svc.cluster.local'
    );
  }

  private get internalPort(): string {
    return process.env.PORT ?? '3000';
  }

  async aggregate(): Promise<AggregatedMetricsSummary> {
    const local = await this.metrics.summary();
    const token = this.internalToken;

    // No discovery token configured → degrade to single-Pod view rather than
    // exposing an unauthenticated metrics endpoint.
    if (!token) {
      return {
        ...local,
        pods: 1,
        podNames: [local.pod],
        aggregated: false,
        aggregationNote: 'INTERNAL_API_TOKEN not set; showing local Pod only',
      };
    }

    let podIPs: string[] = [];
    try {
      podIPs = await dnsP.resolve4(this.discoveryHost);
    } catch (err) {
      this.logger.warn(
        `DNS lookup failed for ${this.discoveryHost}: ${(err as Error).message}`,
      );
      return {
        ...local,
        pods: 1,
        podNames: [local.pod],
        aggregated: false,
        aggregationNote: `DNS discovery failed (${(err as Error).message})`,
      };
    }

    if (podIPs.length <= 1) {
      return {
        ...local,
        pods: podIPs.length || 1,
        podNames: [local.pod],
        aggregated: false,
        aggregationNote: 'Only one Pod discovered',
      };
    }

    const fetches = await Promise.allSettled(
      podIPs.map((ip) =>
        fetch(
          `http://${ip}:${this.internalPort}/api/v1/admin/queues/metrics-summary-internal`,
          {
            headers: { 'x-internal-token': token },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          },
        ).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status} from ${ip}`);
          return (await r.json()) as MetricsSummary;
        }),
      ),
    );

    const summaries: MetricsSummary[] = [];
    let failedCount = 0;
    for (const r of fetches) {
      if (r.status === 'fulfilled') summaries.push(r.value);
      else {
        failedCount += 1;
        this.logger.warn(`Pod fetch failed: ${r.reason}`);
      }
    }

    if (summaries.length === 0) {
      return {
        ...local,
        pods: 1,
        podNames: [local.pod],
        aggregated: false,
        aggregationNote: 'All sibling fetches failed; showing local only',
      };
    }

    // Aggregate
    const total = summaries.reduce((s, x) => s + x.requests.total, 0);
    const byStatus: Record<string, number> = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    };
    for (const s of summaries) {
      for (const k of Object.keys(byStatus)) {
        byStatus[k] += s.requests.by_status[k] ?? 0;
      }
    }
    // Latency: weighted average by request count; p95 use the max across Pods
    // as a conservative upper bound (true quantile aggregation needs raw buckets).
    const weightedAvg =
      total > 0
        ? summaries.reduce(
            (sum, s) => sum + s.latency_seconds.avg * s.requests.total,
            0,
          ) / total
        : 0;
    const maxP95 = summaries.reduce(
      (m, s) => Math.max(m, s.latency_seconds.p95),
      0,
    );

    return {
      pod: 'aggregated',
      pods: summaries.length,
      podNames: summaries.map((s) => s.pod),
      aggregated: true,
      aggregationNote:
        failedCount > 0
          ? `${failedCount} Pod(s) didn't respond in ${FETCH_TIMEOUT_MS}ms`
          : undefined,
      uptime_seconds: Math.max(...summaries.map((s) => s.uptime_seconds)),
      requests: { total, by_status: byStatus },
      latency_seconds: { avg: weightedAvg, p95: maxP95 },
      memory_mb:
        Math.round(
          (summaries.reduce((s, x) => s + x.memory_mb, 0) / summaries.length) *
            10,
        ) / 10,
    };
  }
}
