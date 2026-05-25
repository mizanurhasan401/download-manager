'use client';

import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/shared/loading';
import { ErrorState } from '@/components/shared/error-state';
import { useHealthCheck } from '@/features/health/hooks/useHealthCheck';
import { cn } from '@/lib/utils';

function StatusIcon({ status }: { status: string }) {
  if (status === 'up' || status === 'ok') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export function HealthPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useHealthCheck();

  if (isLoading) {
    return <Loading label="Checking API health..." />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Health check failed"
        message="Unable to reach the API. Make sure the backend is running."
        onRetry={() => refetch()}
      />
    );
  }

  const overallUp = data.status === 'ok' || data.status === 'up';
  const checks = data.details ?? data.info ?? {};

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            API Status
          </CardTitle>
          <Badge variant={overallUp ? 'success' : 'destructive'}>
            {data.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {overallUp
              ? 'All systems operational.'
              : 'One or more services are experiencing issues.'}
            {isFetching && ' Refreshing...'}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(checks).map(([name, check]) => (
          <Card key={name} className="border-border/60 bg-card/80">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                <span className="font-medium capitalize">{name}</span>
              </div>
              <span
                className={cn(
                  'text-sm capitalize',
                  check.status === 'up' || check.status === 'ok'
                    ? 'text-emerald-400'
                    : 'text-destructive',
                )}
              >
                {check.status}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.error && Object.keys(data.error).length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.error).map(([name, err]) => (
              <div key={name} className="text-sm">
                <span className="font-medium capitalize">{name}: </span>
                <span className="text-muted-foreground">
                  {err.message ?? err.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
