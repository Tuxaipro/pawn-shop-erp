import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

interface ModuleStubPageProps {
  title: string;
  description: string;
  buildOrder: number;
}

export function ModuleStubPage({ title, description, buildOrder }: ModuleStubPageProps) {
  return (
    <Card className="max-w-lg">
      <h1 className="text-2xl/8 font-semibold tracking-tight text-zinc-950">{title}</h1>
      <p className="mt-2 text-sm/6 text-zinc-500">{description}</p>
      <div className="mt-4">
        <Badge variant="soon">Module {buildOrder} — Coming next</Badge>
      </div>
      <p className="mt-4 text-sm/6 text-zinc-500">
        API routes at <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">/api/v1</code> return 501 until implemented.
      </p>
    </Card>
  );
}
