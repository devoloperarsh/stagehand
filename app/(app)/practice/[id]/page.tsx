import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { PracticeRecorder } from "./practice-recorder";

export const dynamic = "force-dynamic";

export default async function PracticeQuestionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: question } = await supabase
    .from("practice_questions")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!question) notFound();

  const { data: prior } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("question_id", question.id)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="container max-w-3xl py-10">
      <Button asChild variant="ghost" size="sm">
        <Link href="/practice">← All questions</Link>
      </Button>

      <Card className="mt-4">
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{labelCategory(question.category)}</Badge>
            <Badge
              variant={
                question.difficulty === "easy"
                  ? "success"
                  : question.difficulty === "medium"
                    ? "warning"
                    : "destructive"
              }
            >
              {question.difficulty}
            </Badge>
          </div>
          <h1 className="mt-4 text-2xl font-bold leading-snug">{question.question_text}</h1>
          {question.ideal_answer_structure && (
            <p className="mt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">Tip:</strong>{" "}
              {question.ideal_answer_structure}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <PracticeRecorder
          questionId={question.id}
          questionText={question.question_text}
          userId={user.id}
          category={question.category}
        />
      </div>

      {prior && prior.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Your previous attempts</h2>
          <div className="mt-3 space-y-3">
            {prior.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm">
                      Score: <span className="font-semibold">{p.score ?? "—"}/10</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>
                  {p.feedback && (
                    <p className="max-w-md text-sm text-muted-foreground line-clamp-2">
                      {(p.feedback as { suggestion?: string }).suggestion}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
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
