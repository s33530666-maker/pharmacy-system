-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Drug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "arabicName" TEXT,
    "barcode" TEXT,
    "genericName" TEXT NOT NULL,
    "description" TEXT,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "sellPrice" REAL NOT NULL DEFAULT 0,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Drug" ("barcode", "createdAt", "description", "dosageForm", "genericName", "id", "manufacturer", "name", "status", "strength", "updatedAt") SELECT "barcode", "createdAt", "description", "dosageForm", "genericName", "id", "manufacturer", "name", "status", "strength", "updatedAt" FROM "Drug";
DROP TABLE "Drug";
ALTER TABLE "new_Drug" RENAME TO "Drug";
CREATE UNIQUE INDEX "Drug_barcode_key" ON "Drug"("barcode");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
