-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'VIMEO', 'OTHER');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'MERGING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DownloadEventType" AS ENUM ('CREATED', 'QUEUED', 'STARTED', 'PROGRESS', 'MERGING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "url_hash" TEXT NOT NULL,
    "provider" "VideoProvider" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "duration" INTEGER,
    "uploader" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_jobs" (
    "id" UUID NOT NULL,
    "format_id" TEXT NOT NULL,
    "quality" TEXT,
    "media_type" "MediaType" NOT NULL DEFAULT 'VIDEO',
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "file_path" TEXT,
    "file_name" TEXT,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "error_message" TEXT,
    "queue_job_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "video_id" UUID NOT NULL,
    "user_id" UUID,

    CONSTRAINT "download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_history" (
    "id" UUID NOT NULL,
    "event" "DownloadEventType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "download_job_id" UUID NOT NULL,

    CONSTRAINT "download_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "videos_url_hash_key" ON "videos"("url_hash");

-- CreateIndex
CREATE INDEX "videos_provider_idx" ON "videos"("provider");

-- CreateIndex
CREATE INDEX "videos_created_at_idx" ON "videos"("created_at");

-- CreateIndex
CREATE INDEX "download_jobs_status_idx" ON "download_jobs"("status");

-- CreateIndex
CREATE INDEX "download_jobs_video_id_idx" ON "download_jobs"("video_id");

-- CreateIndex
CREATE INDEX "download_jobs_created_at_idx" ON "download_jobs"("created_at");

-- CreateIndex
CREATE INDEX "download_jobs_queue_job_id_idx" ON "download_jobs"("queue_job_id");

-- CreateIndex
CREATE INDEX "download_history_download_job_id_idx" ON "download_history"("download_job_id");

-- CreateIndex
CREATE INDEX "download_history_event_idx" ON "download_history"("event");

-- CreateIndex
CREATE INDEX "download_history_created_at_idx" ON "download_history"("created_at");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_history" ADD CONSTRAINT "download_history_download_job_id_fkey" FOREIGN KEY ("download_job_id") REFERENCES "download_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
