import ExamHeader from "@/components/ExamHeader/ExamHeader";
import ExamIntegrityGuard from "@/components/ExamIntegrity/ExamIntegrityGuard";
import { cx } from "@/lib/cx";
import styles from "./ExamLayout.module.css";

export default function ExamLayout({
  children,
  mode = "default",
  showTimer = true,
}) {
  const isQuiz = mode === "quiz";
  const isProduction = mode === "production";
  const usesDesktopViewport = isQuiz || isProduction;

  return (
    <main className={cx(styles.page, usesDesktopViewport && styles.desktopViewportPage)}>
      <ExamHeader showTimer={showTimer} />
      {usesDesktopViewport && <ExamIntegrityGuard />}
      <div
        className={cx(
          styles.grid,
          usesDesktopViewport && styles.desktopViewportGrid,
          isProduction && styles.production,
        )}
      >
        {children}
      </div>
    </main>
  );
}
