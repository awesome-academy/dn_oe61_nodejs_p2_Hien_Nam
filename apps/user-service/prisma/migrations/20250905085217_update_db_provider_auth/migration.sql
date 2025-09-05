-- DropIndex
DROP INDEX `auth_providers_provider_key` ON `auth_providers`;

-- AlterTable
ALTER TABLE `auth_providers` ALTER COLUMN `provider` DROP DEFAULT;
