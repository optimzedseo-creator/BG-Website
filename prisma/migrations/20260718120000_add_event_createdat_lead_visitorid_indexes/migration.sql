-- Wave 3b index baseline (ADMIN-IQ). Additive only: two indexes, nothing
-- dropped, nothing altered. Generated via `prisma migrate diff` (schema-to-
-- schema, offline) and verified additive-only before landing.
--
--   Event.createdAt  — Event is the unbounded growth table; PageView already
--                      has a plain createdAt index. Keeps window scans and the
--                      activity-stream newest-first ordering index-ordered.
--   Lead.visitorId   — the CRM<->analytics bridge column. Lead-detail journey
--                      + first-touch join (Lead.visitorId -> PageView) and the
--                      visitorId->lead stitch lookup ride this index.

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_visitorId_idx" ON "Lead"("visitorId");
