-- Runs before vertical_journeys on timestamp order: skip until table exists (CI fresh DB).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_training_leads'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_training_leads' AND column_name = 'enquiry_id'
  ) THEN
    ALTER TABLE "student_training_leads" ADD COLUMN "enquiry_id" TEXT;
    CREATE UNIQUE INDEX "student_training_leads_enquiry_id_key" ON "student_training_leads"("enquiry_id");
    ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
