import { Badge } from '@/components/ui/badge';
import type { ValidationResult, ValidationCriterionResult } from '@sentinel/shared';

interface ValidationResultPanelProps {
  artifactContent: string;
}

const STATUS_COLORS: Record<string, string> = {
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  skip: 'bg-gray-100 text-gray-600',
};

const CRITERION_LABELS: Record<string, string> = {
  tests: 'Tests',
  patterns: 'Pattern Compliance',
  acceptance_criteria: 'Acceptance Criteria',
  architectural_drift: 'Architectural Drift',
  storybook: 'Storybook Stories',
  self_review: 'Self-Review',
  plan_adherence: 'Plan Adherence',
};

export function ValidationResultPanel({ artifactContent }: ValidationResultPanelProps) {
  let parsed: ValidationResult | null = null;
  try {
    parsed = JSON.parse(artifactContent);
  } catch {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">Could not parse validation result.</p>
        <pre className="mt-2 text-xs whitespace-pre-wrap">{artifactContent}</pre>
      </div>
    );
  }

  if (!parsed) return null;

  const isPassing = parsed.result === 'PASS';

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Validation Result</h4>
        <Badge className={isPassing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {parsed.result}
        </Badge>
      </div>

      {parsed.summary && (
        <p className="text-sm text-muted-foreground">{parsed.summary}</p>
      )}

      <div className="space-y-2">
        {parsed.criteria?.map((criterion: ValidationCriterionResult) => (
          <div key={criterion.name} className="flex items-start gap-2 text-sm">
            <Badge variant="outline" className={STATUS_COLORS[criterion.status] ?? ''}>
              {criterion.status}
            </Badge>
            <div>
              <span className="font-medium">{CRITERION_LABELS[criterion.name] ?? criterion.name}</span>
              <p className="text-xs text-muted-foreground">{criterion.details}</p>
              {criterion.items?.map((item, idx) => (
                <div key={idx} className="ml-4 text-xs flex items-center gap-1">
                  <input type="checkbox" checked={item.met} readOnly className="rounded" />
                  <span>{item.description}</span>
                  {item.notes && <span className="text-muted-foreground">({item.notes})</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {parsed.feedback && (
        <div className="mt-3 rounded-md bg-red-50 p-3">
          <h5 className="text-sm font-semibold text-red-800">Feedback for Re-work</h5>
          <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{parsed.feedback}</p>
        </div>
      )}
    </div>
  );
}
