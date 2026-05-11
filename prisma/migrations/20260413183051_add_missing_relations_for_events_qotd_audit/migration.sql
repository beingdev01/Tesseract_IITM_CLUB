-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;

UPDATE "audit_logs"
SET "user_id" = NULL
WHERE "user_id" IS NOT NULL
	AND NOT EXISTS (
		SELECT 1 FROM "users" WHERE "users"."id" = "audit_logs"."user_id"
	);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
