import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApproveRejectPlan } from '@/hooks/use-agent-sessions';

interface PlanReviewPanelProps {
  sessionId: string;
  planContent: string;
}

export function PlanReviewPanel({ sessionId, planContent }: PlanReviewPanelProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const action = useApproveRejectPlan();

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-800">Plan Review Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-80 overflow-y-auto rounded border border-amber-200 bg-white p-3">
          <pre className="whitespace-pre-wrap text-sm font-mono">{planContent}</pre>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => action.mutate({ sessionId, action: 'approve' })}
            disabled={action.isPending}
          >
            Approve Plan
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReject(!showReject)}
          >
            Reject
          </Button>
        </div>

        {showReject && (
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => action.mutate({ sessionId, action: 'reject', reason: rejectReason || undefined })}
              disabled={action.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
