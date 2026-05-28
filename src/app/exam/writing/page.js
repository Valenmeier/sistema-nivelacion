import { redirect } from "next/navigation";
import ExamLayout from "@/components/ExamLayout/ExamLayout";
import SectionNavigator from "@/components/Production/SectionNavigator/SectionNavigator";
import WritingClient from "@/components/Production/Writing/WritingClient";
import { getCurrentExam } from "@/lib/session";

export default async function WritingPage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");

  return (
    <ExamLayout mode="production">
      <WritingClient task={exam.writing} />
      <SectionNavigator active="writing" />
    </ExamLayout>
  );
}
