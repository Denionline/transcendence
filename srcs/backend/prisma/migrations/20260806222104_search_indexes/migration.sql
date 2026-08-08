-- CreateIndex
CREATE INDEX "ArtistProfile_category_idx" ON "ArtistProfile"("category");

-- CreateIndex
CREATE INDEX "ArtistProfile_category_availability_idx" ON "ArtistProfile"("category", "availability");

-- CreateIndex
CREATE INDEX "Gig_status_createdAt_idx" ON "Gig"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Gig_status_category_idx" ON "Gig"("status", "category");

-- CreateIndex
CREATE INDEX "Gig_category_idx" ON "Gig"("category");
