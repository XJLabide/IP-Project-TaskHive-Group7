-- Support queue ordering and bounded oversight reads. No new table or grants.
CREATE INDEX "Report_status_createdAt_id_idx" ON "Report"("status", "createdAt", "id");
CREATE INDEX "Dispute_status_createdAt_id_idx" ON "Dispute"("status", "createdAt", "id");
CREATE INDEX "CancellationRequest_status_createdAt_id_idx" ON "CancellationRequest"("status", "createdAt", "id");
CREATE INDEX "TaskerVerification_appealStatus_appealedAt_userId_idx" ON "TaskerVerification"("appealStatus", "appealedAt", "userId");
CREATE INDEX "Task_updatedAt_id_idx" ON "Task"("updatedAt" DESC, "id" DESC);
CREATE INDEX "User_isAdmin_updatedAt_id_idx" ON "User"("isAdmin", "updatedAt" DESC, "id" DESC);
CREATE INDEX "AdminAction_createdAt_id_idx" ON "AdminAction"("createdAt" DESC, "id" DESC);
