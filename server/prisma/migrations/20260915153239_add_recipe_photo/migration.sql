-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photo" BYTEA,
ADD COLUMN     "photoType" TEXT;
