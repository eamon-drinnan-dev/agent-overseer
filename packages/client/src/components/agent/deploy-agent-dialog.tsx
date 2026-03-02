import { useState } from 'react';
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

interface DeployAgentDialogProps {
  ticketId: string;
  ticketTitle?: string;
  trigger?: React.ReactNode;
}

export function DeployAgentDialog({ ticketId, ticketTitle, trigger }: DeployAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState('claude-sonnet-4-5-20250929');
  const [maxTurns, setMaxTurns] = useState(50);
  const navigate = useNavigate();

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

          <div>
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-5-20250929">Sonnet 4.5</SelectItem>
                <SelectItem value="claude-opus-4-6">Opus 4.6</SelectItem>
                <SelectItem value="claude-haiku-4-5">Haiku 4.5</SelectItem>
              </SelectContent>
            </Select>
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
