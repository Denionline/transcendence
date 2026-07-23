/*
  Warnings:

  - The `rate` column on the `ArtistProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ArtistProfile" DROP COLUMN "rate",
ADD COLUMN     "rate" INTEGER;
