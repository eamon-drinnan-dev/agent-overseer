export function AgentTerminalPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Agent Terminal</h2>
      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Agent terminal will be available in Phase 3.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Live output from active agent sessions will stream here.
        </p>
      </div>
    </div>
  );
}
