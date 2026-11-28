ALTER TABLE "TaskerVerification"
ADD COLUMN "idDocumentPublicId" TEXT,
ADD COLUMN "idDocumentFormat" TEXT,
ADD COLUMN "idDocumentUploadedAt" TIMESTAMP(3),
ADD COLUMN "idDocumentConsentAt" TIMESTAMP(3);
