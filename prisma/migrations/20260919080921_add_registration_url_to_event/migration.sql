-- AlterTable
ALTER TABLE "events" ADD COLUMN     "registration_url" TEXT;

-- AlterTable
ALTER TABLE "hiring_applications" ALTER COLUMN "roles_applied" DROP DEFAULT;
