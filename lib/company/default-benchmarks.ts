export interface BenchmarkDefault {
  platform: string
  metric_name: string
  benchmark_value: number
  benchmark_unit: string
}

export const DEFAULT_BENCHMARKS: BenchmarkDefault[] = [
  { platform: 'LinkedIn', metric_name: 'Impressions', benchmark_value: 5000, benchmark_unit: 'count' },
  { platform: 'LinkedIn', metric_name: 'Engagement rate', benchmark_value: 2, benchmark_unit: '%' },
  { platform: 'LinkedIn', metric_name: 'Click-through rate', benchmark_value: 0.8, benchmark_unit: '%' },
  { platform: 'Twitter/X', metric_name: 'Impressions', benchmark_value: 3000, benchmark_unit: 'count' },
  { platform: 'Twitter/X', metric_name: 'Engagement rate', benchmark_value: 1.5, benchmark_unit: '%' },
  { platform: 'Instagram', metric_name: 'Reach', benchmark_value: 2000, benchmark_unit: 'count' },
  { platform: 'Instagram', metric_name: 'Engagement rate', benchmark_value: 3, benchmark_unit: '%' },
  { platform: 'YouTube', metric_name: 'Views', benchmark_value: 1000, benchmark_unit: 'count' },
  { platform: 'YouTube', metric_name: 'Watch time', benchmark_value: 45, benchmark_unit: '%' },
  { platform: 'TikTok', metric_name: 'Views', benchmark_value: 5000, benchmark_unit: 'count' },
  { platform: 'TikTok', metric_name: 'Engagement rate', benchmark_value: 5, benchmark_unit: '%' },
  { platform: 'Newsletter', metric_name: 'Open rate', benchmark_value: 25, benchmark_unit: '%' },
  { platform: 'Newsletter', metric_name: 'Click rate', benchmark_value: 3, benchmark_unit: '%' },
  { platform: 'Blog', metric_name: 'Page views', benchmark_value: 500, benchmark_unit: 'count' },
  { platform: 'Blog', metric_name: 'Avg. time on page', benchmark_value: 3, benchmark_unit: 'min' },
  { platform: 'Podcast', metric_name: 'Downloads', benchmark_value: 200, benchmark_unit: 'count' },
  { platform: 'Podcast', metric_name: 'Completion rate', benchmark_value: 60, benchmark_unit: '%' },
]
