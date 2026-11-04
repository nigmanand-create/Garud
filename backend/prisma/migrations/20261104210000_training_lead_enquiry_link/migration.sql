-- Link course interest to admin enquiry; partner inbox dedupes Lead row (NEXT-P4).
ALTER TABLE "student_training_leads" ADD COLUMN "enquiry_id" TEXT;

CREATE UNIQUE INDEX "student_training_leads_enquiry_id_key" ON "student_training_leads"("enquiry_id");

ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
