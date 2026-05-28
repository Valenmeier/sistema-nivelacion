import ExamHeader from "@/components/ExamHeader/ExamHeader";
import { cx } from "@/lib/cx";
import styles from "./ExamLayout.module.css";

export default function ExamLayout({
  children,
  mode = "default",
  showTimer = true,
}) {
  const isQuiz = mode === "quiz";
  const isProduction = mode === "production";

  return (
    <main className={cx(styles.page, isQuiz && styles.quizPage)}>
      <ExamHeader showTimer={showTimer} />
      <div
        className={cx(
          styles.grid,
          isQuiz && styles.quizGrid,
          isProduction && styles.production,
        )}
      >
        {children}
      </div>
    </main>
  );
}
