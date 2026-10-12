export function PlatformLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="platform-card platform-loading" aria-busy="true">
      <p className="platform-muted">{label}</p>
    </div>
  );
}
