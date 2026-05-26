-- CreateEnum
CREATE TYPE "ImageOperation" AS ENUM ('CONVERT', 'RESIZE', 'REMOVE_BACKGROUND');

-- CreateEnum
CREATE TYPE "ImageJobStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImageFormat" AS ENUM ('JPEG', 'PNG', 'WEBP', 'AVIF');

-- CreateEnum
CREATE TYPE "ImageFileKind" AS ENUM ('ORIGINAL', 'OUTPUT');

-- CreateEnum
CREATE TYPE "ResizeFit" AS ENUM ('COVER', 'CONTAIN', 'FILL', 'INSIDE', 'OUTSIDE');

-- CreateEnum
CREATE TYPE "ImageEventType" AS ENUM ('CREATED', 'QUEUED', 'STARTED', 'PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "image_jobs" (
    "id" UUID NOT NULL,
    "operation" "ImageOperation" NOT NULL,
    "status" "ImageJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parameters" JSONB NOT NULL,
    "error_message" TEXT,
    "queue_job_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_files" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "kind" "ImageFileKind" NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "format" "ImageFormat",
    "has_alpha" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_history" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "event" "ImageEventType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_jobs_status_idx" ON "image_jobs"("status");

-- CreateIndex
CREATE INDEX "image_jobs_operation_idx" ON "image_jobs"("operation");

-- CreateIndex
CREATE INDEX "image_jobs_created_at_idx" ON "image_jobs"("created_at");

-- CreateIndex
CREATE INDEX "image_files_job_id_idx" ON "image_files"("job_id");

-- CreateIndex
CREATE INDEX "image_files_kind_idx" ON "image_files"("kind");

-- CreateIndex
CREATE INDEX "image_history_job_id_idx" ON "image_history"("job_id");

-- CreateIndex
CREATE INDEX "image_history_event_idx" ON "image_history"("event");

-- AddForeignKey
ALTER TABLE "image_files" ADD CONSTRAINT "image_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "image_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_history" ADD CONSTRAINT "image_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "image_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
