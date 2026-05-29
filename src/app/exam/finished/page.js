import { redirect } from "next/navigation";
import ExamLayout from "@/components/ExamLayout/ExamLayout";
import FinishedScreen from "@/components/FinishedScreen/FinishedScreen";
import { getCurrentExam } from "@/lib/session";

export default async function FinishedPage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");
  if (exam.status === "CANCELLED") redirect("/exam/cancelled");

  return (
    <ExamLayout showTimer={false}>
      <FinishedScreen />
    </ExamLayout>
  );
}
