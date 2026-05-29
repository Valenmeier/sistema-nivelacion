import { redirect } from "next/navigation";
import ExamPolicy from "@/components/ExamPolicy/ExamPolicy";
import { getCurrentExam } from "@/lib/session";

export default async function PolicyPage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");

  return <ExamPolicy language={exam.language} />;
}
