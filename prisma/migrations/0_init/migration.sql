-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "calendlyEventUri" TEXT,
    "calendlyInviteeUri" TEXT,
    "visitorId" TEXT,
    "leadId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "visitorId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GscCountryDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "country" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscCountryDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GscDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GscQuery" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "query" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "isBranded" BOOLEAN NOT NULL,
    "brandedAmbiguous" BOOLEAN NOT NULL,
    "isCollision" BOOLEAN NOT NULL,
    "intentBucket" TEXT,
    "isGeo" BOOLEAN NOT NULL,
    "classifierVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "inquiryType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "visitorId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'contact_form',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "referrer" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "duration" INTEGER,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'site',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_leadId_createdAt_idx" ON "public"."Activity"("leadId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "public"."Booking"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Booking_visitorId_idx" ON "public"."Booking"("visitorId" ASC);

-- CreateIndex
CREATE INDEX "Event_name_createdAt_idx" ON "public"."Event"("name" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Event_visitorId_createdAt_idx" ON "public"."Event"("visitorId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GscCountryDaily_date_country_key" ON "public"."GscCountryDaily"("date" ASC, "country" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GscDaily_date_key" ON "public"."GscDaily"("date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GscQuery_date_query_page_key" ON "public"."GscQuery"("date" ASC, "query" ASC, "page" ASC);

-- CreateIndex
CREATE INDEX "GscQuery_intentBucket_date_idx" ON "public"."GscQuery"("intentBucket" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "GscQuery_isBranded_date_idx" ON "public"."GscQuery"("isBranded" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "GscQuery_page_date_idx" ON "public"."GscQuery"("page" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "public"."Lead"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "public"."Lead"("email" ASC);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "public"."Lead"("status" ASC);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "public"."PageView"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "PageView_path_createdAt_idx" ON "public"."PageView"("path" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "public"."PageView"("path" ASC);

-- CreateIndex
CREATE INDEX "PageView_visitorId_idx" ON "public"."PageView"("visitorId" ASC);

-- CreateIndex
CREATE INDEX "Subscriber_createdAt_idx" ON "public"."Subscriber"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "public"."Subscriber"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

