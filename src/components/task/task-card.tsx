import Link from "next/link";
import { Clock, MapPin, MessageSquare, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TaskCardProps = {
  task: {
    id: string;
    title: string;
    category: string;
    mode: string;
    status: string;
    budget: number;
    distance: string;
    deadline: string;
  };
};

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{task.title}</CardTitle>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {task.distance}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {task.deadline}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Chat before hiring
              </span>
            </div>
          </div>
          <Badge>{task.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <strong className="text-base">PHP {task.budget}</strong>
              <span className="text-zinc-500">{task.category}</span>
              <span className="text-zinc-500">{task.mode}</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-600">
              <Star className="h-4 w-4 fill-zinc-900 text-zinc-900" />
              Poster rating 4.9
            </div>
          </div>
          <Button asChild size="sm">
            <Link href={`/tasks/${task.id}`}>View task</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
