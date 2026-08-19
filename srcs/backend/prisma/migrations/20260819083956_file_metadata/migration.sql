/*
  Safe despite the warnings below: the `File` table has always been empty.
  It was declared in 20260720095303_full_schema_implementation and no code
  ever wrote to it — `git grep prisma.file` on the commit before this branch
  returns nothing — so the module that finally uses it is the same one adding
  these columns. There is no existing row for a NOT NULL column to fail on,
  here or on any other machine.

  `visibility` gets a default anyway, because it is the one column with a
  meaningful safe value: anything already stored should be private.

  Warnings:

  - Added the required column `mimeType` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeBytes` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('private', 'public');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL,
ADD COLUMN     "visibility" "FileVisibility" NOT NULL DEFAULT 'private';

-- CreateIndex
CREATE INDEX "File_ownerId_visibility_idx" ON "File"("ownerId", "visibility");
