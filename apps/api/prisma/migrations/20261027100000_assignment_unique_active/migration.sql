CREATE UNIQUE INDEX "Assignment_active_unique" ON "Assignment" ("occurrenceId", "guideId") WHERE "withdrawn" = false;
