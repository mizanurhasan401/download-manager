-- CreateEnum
CREATE TYPE "AudioFormat" AS ENUM ('MP3', 'M4A', 'WAV');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('SINGLE', 'PLAYLIST_ITEM', 'CLIP', 'AUDIO_EXTRACT');

-- CreateEnum
CREATE TYPE "PlaylistStatus" AS ENUM ('PENDING', 'EXTRACTING', 'READY', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SharedLinkVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PASSWORD_PROTECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DownloadEventType" ADD VALUE 'RETRYING';
ALTER TYPE "DownloadEventType" ADD VALUE 'RESUMED';

-- AlterEnum
ALTER TYPE "VideoProvider" ADD VALUE 'TWITTER';

-- AlterTable
ALTER TABLE "download_jobs" ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "audio_bitrate" INTEGER,
ADD COLUMN     "audio_format" "AudioFormat",
ADD COLUMN     "bytes_downloaded" BIGINT,
ADD COLUMN     "clip_end_seconds" DOUBLE PRECISION,
ADD COLUMN     "clip_start_seconds" DOUBLE PRECISION,
ADD COLUMN     "job_kind" "JobKind" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "last_attempt_at" TIMESTAMP(3),
ADD COLUMN     "partial_file_path" TEXT,
ADD COLUMN     "playlist_id" UUID,
ADD COLUMN     "resumable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "playlists" (
    "id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_url_hash" TEXT NOT NULL,
    "provider" "VideoProvider" NOT NULL,
    "title" TEXT,
    "uploader" TEXT,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "selected_items" INTEGER NOT NULL DEFAULT 0,
    "status" "PlaylistStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "user_id" UUID,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_items" (
    "id" UUID NOT NULL,
    "playlist_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "video_url" TEXT NOT NULL,
    "title" TEXT,
    "duration" INTEGER,
    "thumbnail_url" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_links" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "download_job_id" UUID NOT NULL,
    "visibility" "SharedLinkVisibility" NOT NULL DEFAULT 'PUBLIC',
    "password_hash" TEXT,
    "expires_at" TIMESTAMP(3),
    "max_accesses" INTEGER,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,

    CONSTRAINT "shared_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "playlists_provider_idx" ON "playlists"("provider");

-- CreateIndex
CREATE INDEX "playlists_status_idx" ON "playlists"("status");

-- CreateIndex
CREATE INDEX "playlists_created_at_idx" ON "playlists"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_source_url_hash_key" ON "playlists"("source_url_hash");

-- CreateIndex
CREATE INDEX "playlist_items_playlist_id_idx" ON "playlist_items"("playlist_id");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_items_playlist_id_position_key" ON "playlist_items"("playlist_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "shared_links_token_key" ON "shared_links"("token");

-- CreateIndex
CREATE INDEX "shared_links_download_job_id_idx" ON "shared_links"("download_job_id");

-- CreateIndex
CREATE INDEX "shared_links_expires_at_idx" ON "shared_links"("expires_at");

-- CreateIndex
CREATE INDEX "download_jobs_playlist_id_idx" ON "download_jobs"("playlist_id");

-- CreateIndex
CREATE INDEX "download_jobs_job_kind_idx" ON "download_jobs"("job_kind");

-- AddForeignKey
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_download_job_id_fkey" FOREIGN KEY ("download_job_id") REFERENCES "download_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
