import { NextResponse } from "next/server";
import { calculateFinalScore, geminiAnalyze, heuristicAnalyze } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { resume?: string; fileName?: string };
  try {
    body = await request.json() as { resume?: string; fileName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const resume = (body.resume || "").trim();
  if (resume.length < 50) {
    return NextResponse.json({ error: "Resume text is too short or could not be extracted." }, { status: 400 });
  }

  const result = (await geminiAnalyze(resume)) ?? heuristicAnalyze(resume);
  const deterministicScore = calculateFinalScore(result.breakdown);

  return NextResponse.json({
    ...result,
    score: deterministicScore,
    scoreLabel: deterministicScore >= 85 ? "Excellent" : deterministicScore >= 70 ? "Good" : deterministicScore >= 55 ? "Fair" : "Needs Improvement",
  });
}
