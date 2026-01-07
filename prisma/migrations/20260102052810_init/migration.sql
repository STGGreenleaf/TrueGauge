-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'HB Beverage Co',
    "timezone" TEXT NOT NULL DEFAULT 'America/Denver',
    "salesInputMode" TEXT NOT NULL DEFAULT 'NET_SALES_EX_TAX',
    "targetCogsPct" REAL NOT NULL DEFAULT 0.35,
    "targetFeesPct" REAL NOT NULL DEFAULT 0.03,
    "monthlyFixedNut" REAL NOT NULL DEFAULT 15500,
    "nutRent" REAL NOT NULL DEFAULT 0,
    "nutUtilities" REAL NOT NULL DEFAULT 0,
    "nutPhone" REAL NOT NULL DEFAULT 0,
    "nutInternet" REAL NOT NULL DEFAULT 0,
    "nutInsurance" REAL NOT NULL DEFAULT 0,
    "nutLoanPayment" REAL NOT NULL DEFAULT 0,
    "nutPayroll" REAL NOT NULL DEFAULT 0,
    "nutOther1" REAL NOT NULL DEFAULT 0,
    "nutOther1Label" TEXT NOT NULL DEFAULT 'Other 1',
    "nutOther2" REAL NOT NULL DEFAULT 0,
    "nutOther2Label" TEXT NOT NULL DEFAULT 'Other 2',
    "nutOther3" REAL NOT NULL DEFAULT 0,
    "nutOther3Label" TEXT NOT NULL DEFAULT 'Other 3',
    "monthlyRoofFund" REAL NOT NULL DEFAULT 0,
    "monthlyOwnerDrawGoal" REAL NOT NULL DEFAULT 0,
    "openHoursTemplate" TEXT NOT NULL DEFAULT '{"mon":0,"tue":8,"wed":8,"thu":8,"fri":8,"sat":8,"sun":5}',
    "enableTrueHealth" BOOLEAN NOT NULL DEFAULT true,
    "enableSpreading" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("businessName", "createdAt", "enableSpreading", "enableTrueHealth", "id", "monthlyFixedNut", "monthlyOwnerDrawGoal", "monthlyRoofFund", "openHoursTemplate", "salesInputMode", "targetCogsPct", "targetFeesPct", "timezone", "updatedAt") SELECT "businessName", "createdAt", "enableSpreading", "enableTrueHealth", "id", "monthlyFixedNut", "monthlyOwnerDrawGoal", "monthlyRoofFund", "openHoursTemplate", "salesInputMode", "targetCogsPct", "targetFeesPct", "timezone", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
