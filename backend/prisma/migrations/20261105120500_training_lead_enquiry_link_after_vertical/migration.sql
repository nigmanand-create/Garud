-- After vertical_journeys: enquiry link on student_training_leads (fixes CI migrate order vs 20261104210000).
ALTER TABLE "student_training_leads" ADD COLUMN IF NOT EXISTS "enquiry_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "student_training_leads_enquiry_id_key" ON "student_training_leads"("enquiry_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_training_leads_enquiry_id_fkey'
  ) THEN
    ALTER TABLE "student_training_leads" ADD CONSTRAINT "student_training_leads_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
