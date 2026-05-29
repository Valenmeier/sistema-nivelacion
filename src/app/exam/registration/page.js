import { redirect } from "next/navigation";
import CandidateSetup from "@/components/CandidateSetup/CandidateSetup";
import { getCurrentExam } from "@/lib/session";

export default async function RegistrationPage() {
  const exam = await getCurrentExam();
  if (!exam) redirect("/");

  return <CandidateSetup language={exam.language} />;
}
