-- CreateEnum
CREATE TYPE "ConfigurationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'HARD');
CREATE TYPE "CampaignType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'GROUP');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE "AccessCodeStatus" AS ENUM ('AVAILABLE', 'STARTED', 'USED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "AttemptStatus" AS ENUM ('REGISTRATION', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED_PENDING_PROCESSING', 'PROCESSING', 'REPORT_READY', 'ERROR');
CREATE TYPE "AttemptStage" AS ENUM ('REGISTRATION', 'POLICY', 'MULTIPLE_CHOICE', 'WRITING', 'AUDIO', 'FINISHED');
CREATE TYPE "BlockPhase" AS ENUM ('DIAGNOSTIC', 'EXPLORATION', 'CONFIRMATION', 'RESOLUTION');
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'DISPATCHED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ReportReviewStatus" AS ENUM ('PENDING_REVIEW', 'REVIEWED', 'APPROVED');

-- CreateTable
CREATE TABLE "Language" (
    "id" UUID NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Level" (
    "id" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "cefrBand" VARCHAR(4) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Competency" (
    "id" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentConfiguration" (
    "id" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "ConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "AssessmentConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfigurationCompetency" (
    "configurationId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "weight" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ConfigurationCompetency_pkey" PRIMARY KEY ("configurationId","competencyId")
);

CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "legacyKey" VARCHAR(40),
    "languageId" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL,
    "instruction" TEXT NOT NULL DEFAULT 'Seleccioná la respuesta correcta.',
    "passage" TEXT,
    "statement" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingPrompt" (
    "id" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "evaluationNote" TEXT,
    "minWords" INTEGER NOT NULL,
    "maxWords" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "WritingPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OralPrompt" (
    "id" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "minSeconds" INTEGER NOT NULL,
    "maxSeconds" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OralPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "languageId" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "type" "CampaignType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "allocatedPlaces" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessCode" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "codeHash" VARCHAR(64) NOT NULL,
    "codeHint" VARCHAR(24) NOT NULL,
    "status" "AccessCodeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attempt" (
    "id" UUID NOT NULL,
    "accessCodeId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "languageId" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "studentId" UUID,
    "startLevelId" UUID,
    "multipleChoiceResultLevelId" UUID,
    "status" "AttemptStatus" NOT NULL DEFAULT 'REGISTRATION',
    "stage" "AttemptStage" NOT NULL DEFAULT 'REGISTRATION',
    "abandonmentCount" INTEGER NOT NULL DEFAULT 0,
    "policyAcceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttemptBlock" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "phase" "BlockPhase" NOT NULL,
    "evaluatedLevelId" UUID NOT NULL,
    "scoreJson" JSONB,
    "resultJson" JSONB,
    "sustained" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AttemptBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttemptBlockQuestion" (
    "blockId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "selectedOptionId" UUID,
    "answeredAt" TIMESTAMP(3),
    CONSTRAINT "AttemptBlockQuestion_pkey" PRIMARY KEY ("blockId","questionId")
);

CREATE TABLE "IntegrityEvent" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "clientEventKey" VARCHAR(80) NOT NULL,
    "eventType" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingSubmission" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "promptId" UUID NOT NULL,
    "response" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WritingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudioSubmission" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "promptId" UUID NOT NULL,
    "bucket" VARCHAR(100) NOT NULL,
    "objectKey" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100),
    "durationSeconds" INTEGER,
    "sizeBytes" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudioSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessingJob" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "workflowExecutionId" VARCHAR(120),
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinalReport" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "recommendedLevelId" UUID,
    "cefrBand" VARCHAR(4),
    "multipleChoiceResult" JSONB,
    "writingEvaluation" JSONB,
    "audioEvaluation" JSONB,
    "narrative" TEXT,
    "reviewStatus" "ReportReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");
CREATE UNIQUE INDEX "Level_languageId_code_key" ON "Level"("languageId", "code");
CREATE UNIQUE INDEX "Level_languageId_sortOrder_key" ON "Level"("languageId", "sortOrder");
CREATE INDEX "Level_languageId_active_idx" ON "Level"("languageId", "active");
CREATE UNIQUE INDEX "Competency_languageId_code_key" ON "Competency"("languageId", "code");
CREATE INDEX "Competency_languageId_active_idx" ON "Competency"("languageId", "active");
CREATE UNIQUE INDEX "AssessmentConfiguration_languageId_version_key" ON "AssessmentConfiguration"("languageId", "version");
CREATE INDEX "AssessmentConfiguration_languageId_status_idx" ON "AssessmentConfiguration"("languageId", "status");
CREATE INDEX "ConfigurationCompetency_configurationId_active_idx" ON "ConfigurationCompetency"("configurationId", "active");
CREATE UNIQUE INDEX "Question_legacyKey_key" ON "Question"("legacyKey");
CREATE INDEX "Question_languageId_levelId_difficulty_competencyId_active_idx" ON "Question"("languageId", "levelId", "difficulty", "competencyId", "active");
CREATE UNIQUE INDEX "QuestionOption_questionId_position_key" ON "QuestionOption"("questionId", "position");
CREATE UNIQUE INDEX "QuestionOption_one_correct_per_question_key" ON "QuestionOption"("questionId") WHERE "isCorrect" = true;
CREATE INDEX "WritingPrompt_languageId_levelId_active_idx" ON "WritingPrompt"("languageId", "levelId", "active");
CREATE INDEX "OralPrompt_languageId_levelId_active_idx" ON "OralPrompt"("languageId", "levelId", "active");
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");
CREATE INDEX "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");
CREATE INDEX "Campaign_languageId_status_idx" ON "Campaign"("languageId", "status");
CREATE UNIQUE INDEX "AccessCode_codeHash_key" ON "AccessCode"("codeHash");
CREATE INDEX "AccessCode_campaignId_status_idx" ON "AccessCode"("campaignId", "status");
CREATE INDEX "Student_email_idx" ON "Student"("email");
CREATE UNIQUE INDEX "Attempt_accessCodeId_key" ON "Attempt"("accessCodeId");
CREATE INDEX "Attempt_campaignId_status_idx" ON "Attempt"("campaignId", "status");
CREATE INDEX "Attempt_languageId_status_idx" ON "Attempt"("languageId", "status");
CREATE UNIQUE INDEX "AttemptBlock_attemptId_blockNumber_key" ON "AttemptBlock"("attemptId", "blockNumber");
CREATE INDEX "AttemptBlock_attemptId_completedAt_idx" ON "AttemptBlock"("attemptId", "completedAt");
CREATE UNIQUE INDEX "AttemptBlockQuestion_blockId_position_key" ON "AttemptBlockQuestion"("blockId", "position");
CREATE UNIQUE INDEX "IntegrityEvent_attemptId_clientEventKey_key" ON "IntegrityEvent"("attemptId", "clientEventKey");
CREATE INDEX "IntegrityEvent_attemptId_createdAt_idx" ON "IntegrityEvent"("attemptId", "createdAt");
CREATE UNIQUE INDEX "WritingSubmission_attemptId_key" ON "WritingSubmission"("attemptId");
CREATE UNIQUE INDEX "AudioSubmission_attemptId_key" ON "AudioSubmission"("attemptId");
CREATE UNIQUE INDEX "ProcessingJob_attemptId_key" ON "ProcessingJob"("attemptId");
CREATE UNIQUE INDEX "FinalReport_attemptId_key" ON "FinalReport"("attemptId");

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentConfiguration" ADD CONSTRAINT "AssessmentConfiguration_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationCompetency" ADD CONSTRAINT "ConfigurationCompetency_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "AssessmentConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationCompetency" ADD CONSTRAINT "ConfigurationCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingPrompt" ADD CONSTRAINT "WritingPrompt_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingPrompt" ADD CONSTRAINT "WritingPrompt_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OralPrompt" ADD CONSTRAINT "OralPrompt_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OralPrompt" ADD CONSTRAINT "OralPrompt_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "AssessmentConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_accessCodeId_fkey" FOREIGN KEY ("accessCodeId") REFERENCES "AccessCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "AssessmentConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_startLevelId_fkey" FOREIGN KEY ("startLevelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_multipleChoiceResultLevelId_fkey" FOREIGN KEY ("multipleChoiceResultLevelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttemptBlock" ADD CONSTRAINT "AttemptBlock_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttemptBlock" ADD CONSTRAINT "AttemptBlock_evaluatedLevelId_fkey" FOREIGN KEY ("evaluatedLevelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttemptBlockQuestion" ADD CONSTRAINT "AttemptBlockQuestion_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "AttemptBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttemptBlockQuestion" ADD CONSTRAINT "AttemptBlockQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttemptBlockQuestion" ADD CONSTRAINT "AttemptBlockQuestion_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "WritingPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AudioSubmission" ADD CONSTRAINT "AudioSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioSubmission" ADD CONSTRAINT "AudioSubmission_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "OralPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_recommendedLevelId_fkey" FOREIGN KEY ("recommendedLevelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain checks that can be enforced per row. Cross-row rules (active weights sum to 100 and max 4 active competencies) are validated by application services.
ALTER TABLE "ConfigurationCompetency" ADD CONSTRAINT "ConfigurationCompetency_weight_check" CHECK ("weight" >= 0 AND "weight" <= 100);
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_position_check" CHECK ("position" >= 0);
ALTER TABLE "WritingPrompt" ADD CONSTRAINT "WritingPrompt_word_range_check" CHECK ("minWords" > 0 AND "maxWords" >= "minWords");
ALTER TABLE "OralPrompt" ADD CONSTRAINT "OralPrompt_duration_range_check" CHECK ("minSeconds" > 0 AND "maxSeconds" >= "minSeconds");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_allocated_places_check" CHECK ("allocatedPlaces" IS NULL OR "allocatedPlaces" > 0);
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_abandonment_count_check" CHECK ("abandonmentCount" >= 0);
