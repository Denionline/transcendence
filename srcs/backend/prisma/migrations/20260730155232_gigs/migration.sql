/*
  Warnings:

  - You are about to drop the column `rate` on the `ArtistProfile` table. All the data in the column will be lost.
  - You are about to drop the column `hirerId` on the `Match` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[artistId,gigId]` on the table `Match` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gigId,swipedId,swiperId]` on the table `Swipe` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gigId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gigId` to the `Swipe` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('open', 'closed');

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_hirerId_fkey";

-- DropIndex
DROP INDEX "Match_artistId_hirerId_key";

-- DropIndex
DROP INDEX "Swipe_swiperId_swipedId_key";

-- AlterTable
ALTER TABLE "ArtistProfile" DROP COLUMN "rate";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "hirerId",
ADD COLUMN     "gigId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Swipe" ADD COLUMN     "gigId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Gig" (
    "id" TEXT NOT NULL,
    "hirerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "rate" INTEGER,
    "status" "GigStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_artistId_gigId_key" ON "Match"("artistId", "gigId");

-- CreateIndex
CREATE UNIQUE INDEX "Swipe_gigId_swipedId_swiperId_key" ON "Swipe"("gigId", "swipedId", "swiperId");

-- AddForeignKey
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_hirerId_fkey" FOREIGN KEY ("hirerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
