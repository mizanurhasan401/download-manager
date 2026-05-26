'use client';

import { Sparkles } from 'lucide-react';

export function BackgroundRemovePanel() {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">AI background removal</p>
          <p className="text-xs text-muted-foreground">
            Runs entirely on this machine using an ONNX model. First request may
            take a few extra seconds while the model warms up; subsequent
            requests are instant. Output is always a transparent PNG.
          </p>
        </div>
      </div>
    </div>
  );
}
