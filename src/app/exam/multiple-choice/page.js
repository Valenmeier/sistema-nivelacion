import { redirect } from "next/navigation";
import ExamLayout from "@/components/ExamLayout/ExamLayout";
import MultipleChoiceClient from "@/components/MultipleChoice/MultipleChoiceClient";
import { getCurrentExam } from "@/lib/session";

export const runtime = "nodejs";

export default async function MultipleChoicePage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");
  if (exam.status === "CANCELLED") redirect("/exam/cancelled");
  if (exam.stage === "REGISTRATION") redirect("/exam/registration");
  if (exam.stage === "POLICY") redirect("/exam/policy");
  if (exam.stage === "WRITING" || exam.stage === "AUDIO" || exam.stage === "FINISHED") {
    redirect("/exam/writing");
  }

  return (
    <ExamLayout mode="quiz">
      <MultipleChoiceClient />
    </ExamLayout>
  );
}
