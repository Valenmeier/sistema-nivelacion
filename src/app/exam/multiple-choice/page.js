import { redirect } from "next/navigation";
import ExamLayout from "@/components/ExamLayout/ExamLayout";
import MultipleChoiceClient from "@/components/MultipleChoice/MultipleChoiceClient";
import { getCurrentExam } from "@/lib/session";

export default async function MultipleChoicePage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");

  return (
    <ExamLayout mode="quiz">
      <MultipleChoiceClient questions={exam.multipleChoice} />
    </ExamLayout>
  );
}
