import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeployAgent, useAgentConfig } from '@/hooks/use-agent-sessions';
import { useNavigate } from 'react-router-dom';
import {
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  getDefaultModelForCriticality,
  DEFAULT_AGENT_MODEL,
  type AgentModel,
  type Criticality,
} from '@sentinel/shared';

interface DeployAgentDialogProps {
  ticketId: string;
  ticketTitle?: string;
  criticality?: Criticality;
  trigger?: React.ReactNode;
}

export function DeployAgentDialog({ ticketId, ticketTitle, criticality, trigger }: DeployAgentDialogProps) {
  const defaultModel = criticality
    ? getDefaultModelForCriticality(criticality)
    : DEFAULT_AGENT_MODEL;

  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<string>(defaultModel);
  const [maxTurns, setMaxTurns] = useState(50);
  const navigate = useNavigate();

  // Update default model if criticality changes (e.g. navigating between tickets)
  useEffect(() => {
    setModel(defaultModel);
  }, [defaultModel]);

  const { data: agentConfig } = useAgentConfig();
  const deploy = useDeployAgent();

  const handleDeploy = () => {
    deploy.mutate(
      { ticketId, model, maxTurns },
      {
        onSuccess: (session) => {
          setOpen(false);
          if (session?.id) {
            navigate(`/agents/${session.id}`);
          }
        },
      },
    );
  };

  if (!agentConfig?.configured) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Deploy Agent</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {ticketTitle && (
            <div>
              <Label className="text-muted-foreground text-xs">Ticket</Label>
              <p className="text-sm font-medium">{ticketTitle}</p>
            </div>
          )}

          {criticality && (
            <div>
              <Label className="text-muted-foreground text-xs">Criticality</Label>
              <p className="text-sm font-medium capitalize">{criticality}</p>
            </div>
          )}

          <div>
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {AGENT_MODEL_LABELS[m as AgentModel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {criticality && (
              <p className="mt-1 text-xs text-muted-foreground">
                {criticality === 'minor'
                  ? 'Sonnet recommended for minor tickets'
                  : 'Opus recommended for critical/standard tickets'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="maxTurns">Max Turns</Label>
            <Input
              id="maxTurns"
              type="number"
              min={1}
              max={200}
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value, 10) || 50)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleDeploy}
            disabled={deploy.isPending}
          >
            {deploy.isPending ? 'Deploying...' : 'Deploy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
