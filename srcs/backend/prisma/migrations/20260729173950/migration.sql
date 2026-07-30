/*
  Warnings:

  - A unique constraint covering the columns `[swiperId,swipedId,gigId]` on the table `Swipe` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gigId` to the `Swipe` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Swipe_swiperId_swipedId_key";

-- AlterTable
ALTER TABLE "Swipe" ADD COLUMN     "gigId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Gig" (
    "id" TEXT NOT NULL,
    "hirerId" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Swipe_swiperId_swipedId_gigId_key" ON "Swipe"("swiperId", "swipedId", "gigId");

-- AddForeignKey
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_hirerId_fkey" FOREIGN KEY ("hirerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
