-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "heading" VARCHAR(500),
ADD COLUMN     "sub_heading" VARCHAR(500),
ADD COLUMN     "sub_image1_r2_key" TEXT,
ADD COLUMN     "sub_image2_r2_key" TEXT,
ADD COLUMN     "tagline" VARCHAR(255);
