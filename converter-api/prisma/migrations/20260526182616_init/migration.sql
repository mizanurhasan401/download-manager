-- CreateEnum
CREATE TYPE "ConversionCategory" AS ENUM ('DOCUMENT', 'IMAGE');

-- CreateEnum
CREATE TYPE "ConversionJobStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'CONVERTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConversionFileFormat" AS ENUM ('PDF', 'DOCX', 'PPTX', 'XLSX', 'TXT', 'PNG', 'JPG', 'WEBP');

-- CreateEnum
CREATE TYPE "ConversionFileKind" AS ENUM ('ORIGINAL', 'OUTPUT');

-- CreateEnum
CREATE TYPE "ConversionEventType" AS ENUM ('CREATED', 'QUEUED', 'STARTED', 'PROGRESS', 'CONVERTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "file_conversion_jobs" (
    "id" UUID NOT NULL,
    "category" "ConversionCategory" NOT NULL,
    "source_format" "ConversionFileFormat" NOT NULL,
    "target_format" "ConversionFileFormat" NOT NULL,
    "status" "ConversionJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parameters" JSONB NOT NULL,
    "error_message" TEXT,
    "queue_job_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_conversion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_conversion_files" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "kind" "ConversionFileKind" NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "format" "ConversionFileFormat",
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_conversion_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_conversion_history" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "event" "ConversionEventType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_conversion_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_conversion_jobs_status_idx" ON "file_conversion_jobs"("status");

-- CreateIndex
CREATE INDEX "file_conversion_jobs_category_idx" ON "file_conversion_jobs"("category");

-- CreateIndex
CREATE INDEX "file_conversion_jobs_created_at_idx" ON "file_conversion_jobs"("created_at");

-- CreateIndex
CREATE INDEX "file_conversion_files_job_id_idx" ON "file_conversion_files"("job_id");

-- CreateIndex
CREATE INDEX "file_conversion_files_kind_idx" ON "file_conversion_files"("kind");

-- CreateIndex
CREATE INDEX "file_conversion_history_job_id_idx" ON "file_conversion_history"("job_id");

-- CreateIndex
CREATE INDEX "file_conversion_history_event_idx" ON "file_conversion_history"("event");

-- AddForeignKey
ALTER TABLE "file_conversion_files" ADD CONSTRAINT "file_conversion_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "file_conversion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_conversion_history" ADD CONSTRAINT "file_conversion_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "file_conversion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
