interface EmptyTabProps {
  title: string;
  hint: string;
}

export function EmptyTab({ title, hint }: EmptyTabProps) {
  return (
    <div className="border rounded-lg p-12 text-center bg-muted/30">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{hint}</p>
    </div>
  );
}
