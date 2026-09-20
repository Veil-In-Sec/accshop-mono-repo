-- Add landing-page content columns to site_settings
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "hero_badge" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "about_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "about_subtitle" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "about_heading" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "about_para1" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "about_para2" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat1_value" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat1_label" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat2_value" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat2_label" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat3_value" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat3_label" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat4_value" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "stat4_label" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "trust_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "trust_desc" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "trust_bullets" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "values_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "values_subtitle" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "features_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "features_subtitle" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_description" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_stat1_value" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_stat1_label" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_stat2_value" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_stat2_label" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "team_image_url" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "testimonials_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "testimonials_subtitle" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "faq_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "cta_badge" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "cta_title" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "cta_subtitle" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "contact_support_email" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "contact_sales_email" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "testimonials" (
    "id" SERIAL NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 5,
    "tag" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);
