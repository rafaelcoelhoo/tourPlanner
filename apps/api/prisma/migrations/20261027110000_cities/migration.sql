CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

INSERT INTO "City" ("id", "name") VALUES ('city_porto', 'Porto');

ALTER TABLE "User" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Tour" ADD COLUMN "cityId" TEXT;
ALTER TABLE "MonthSchedule" ADD COLUMN "cityId" TEXT;

UPDATE "User" SET "cityId" = 'city_porto' WHERE "role" = 'GUIDE';
UPDATE "Tour" SET "cityId" = 'city_porto';
UPDATE "MonthSchedule" SET "cityId" = 'city_porto';

ALTER TABLE "Tour" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "MonthSchedule" ALTER COLUMN "cityId" SET NOT NULL;

DROP INDEX "Tour_name_key";
DROP INDEX "MonthSchedule_year_month_key";
CREATE UNIQUE INDEX "Tour_cityId_name_key" ON "Tour"("cityId", "name");
CREATE UNIQUE INDEX "MonthSchedule_cityId_year_month_key" ON "MonthSchedule"("cityId", "year", "month");

ALTER TABLE "User" ADD CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MonthSchedule" ADD CONSTRAINT "MonthSchedule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
