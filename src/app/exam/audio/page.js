import { redirect } from "next/navigation";
import ExamLayout from "@/components/ExamLayout/ExamLayout";
import AudioClient from "@/components/Production/Audio/AudioClient";
import SectionNavigator from "@/components/Production/SectionNavigator/SectionNavigator";
import { getCurrentExam } from "@/lib/session";

export default async function AudioPage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");

  return (
    <ExamLayout mode="production">
      <AudioClient task={exam.audio} />
      <SectionNavigator active="audio" />
    </ExamLayout>
  );
}
