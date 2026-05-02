import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { PracticeQuestion } from "@/lib/types";
import { PracticeFilters } from "./practice-filters";

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  difficulty?: string;
}

export default async function PracticePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase.from("practice_questions").select("*");
  if (searchParams.category) query = query.eq("category", searchParams.category);
  if (searchParams.difficulty) query = query.eq("difficulty", searchParams.difficulty);
  const { data: questions } = await query.order("difficulty");

  return (
    <div className="container py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Practice</h1>
          <p className="mt-1 text-muted-foreground">
            Pick a question, hit record, and get instant AI feedback.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PracticeFilters />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(questions ?? []).map((q: PracticeQuestion) => (
          <Link key={q.id} href={`/practice/${q.id}`}>
            <Card className="transition hover:border-primary hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{labelCategory(q.category)}</Badge>
                  <Badge
                    variant={
                      q.difficulty === "easy"
                        ? "success"
                        : q.difficulty === "medium"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {q.difficulty}
                  </Badge>
                </div>
                <p className="mt-3 text-base font-medium leading-snug">{q.question_text}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {(!questions || questions.length === 0) && (
        <p className="mt-12 text-center text-muted-foreground">
          No questions match those filters.
        </p>
      )}
    </div>
  );
}

function labelCategory(c: string) {
  switch (c) {
    case "behavioral":
      return "Behavioral";
    case "technical":
      return "Technical";
    case "system_design":
      return "System Design";
    case "hr":
      return "HR";
    default:
      return c;
  }
}
