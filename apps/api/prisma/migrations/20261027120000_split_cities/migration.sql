-- Braga, Coimbra e Guimarães passam de tours do Porto a cidades independentes (tour primário com o nome da cidade).
INSERT INTO "City" ("id", "name") VALUES
  ('city_braga', 'Braga'), ('city_coimbra', 'Coimbra'), ('city_guimaraes', 'Guimarães')
ON CONFLICT ("name") DO NOTHING;

-- Guias dedicados: atribuições, qualificações e indisponibilidades por slot ligadas aos tours que saem do Porto são removidas.
DELETE FROM "Assignment" a USING "SlotOccurrence" o, "TourSlot" s, "Tour" t, "City" p
WHERE a."occurrenceId" = o."id" AND o."slotId" = s."id" AND s."tourId" = t."id"
  AND p."name" = 'Porto' AND t."cityId" = p."id" AND t."name" IN ('Braga', 'Coimbra', 'Guimarães');

DELETE FROM "GuideQualification" q USING "Tour" t, "City" p
WHERE q."tourId" = t."id" AND t."cityId" = p."id" AND p."name" = 'Porto' AND t."name" IN ('Braga', 'Coimbra', 'Guimarães');

DELETE FROM "Unavailability" u USING "TourSlot" s, "Tour" t, "City" p
WHERE u."slotId" = s."id" AND s."tourId" = t."id" AND t."cityId" = p."id" AND p."name" = 'Porto' AND t."name" IN ('Braga', 'Coimbra', 'Guimarães');

-- Um mês por cidade nova, onde já existiam ocorrências desses tours (matriz mantida, sem rascunho).
INSERT INTO "MonthSchedule" ("id", "cityId", "year", "month", "needsConfirmedAt", "status")
SELECT 'ms_' || c."id" || '_' || m."year" || '_' || m."month", c."id", m."year", m."month", m."needsConfirmedAt", 'NEEDS_DRAFT'
FROM "MonthSchedule" m
JOIN "City" p ON m."cityId" = p."id" AND p."name" = 'Porto'
JOIN "City" c ON c."name" IN ('Braga', 'Coimbra', 'Guimarães')
WHERE EXISTS (
  SELECT 1 FROM "SlotOccurrence" o JOIN "TourSlot" s ON o."slotId" = s."id" JOIN "Tour" t ON s."tourId" = t."id"
  WHERE o."monthId" = m."id" AND t."cityId" = p."id" AND t."name" = c."name"
)
ON CONFLICT DO NOTHING;

UPDATE "SlotOccurrence" o SET "monthId" = nm."id"
FROM "TourSlot" s, "Tour" t, "City" p, "City" c, "MonthSchedule" om, "MonthSchedule" nm
WHERE o."slotId" = s."id" AND s."tourId" = t."id" AND p."name" = 'Porto' AND t."cityId" = p."id"
  AND t."name" IN ('Braga', 'Coimbra', 'Guimarães') AND c."name" = t."name"
  AND om."id" = o."monthId" AND nm."cityId" = c."id" AND nm."year" = om."year" AND nm."month" = om."month";

UPDATE "Tour" t SET "cityId" = c."id", "kind" = 'PRIMARY'
FROM "City" c, "City" p
WHERE p."name" = 'Porto' AND t."cityId" = p."id" AND t."name" = c."name" AND c."name" IN ('Braga', 'Coimbra', 'Guimarães');
