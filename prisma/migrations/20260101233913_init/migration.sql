-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'HB Beverage Co',
    "timezone" TEXT NOT NULL DEFAULT 'America/Denver',
    "salesInputMode" TEXT NOT NULL DEFAULT 'NET_SALES_EX_TAX',
    "targetCogsPct" REAL NOT NULL DEFAULT 0.35,
    "targetFeesPct" REAL NOT NULL DEFAULT 0.03,
    "monthlyFixedNut" REAL NOT NULL DEFAULT 15500,
    "monthlyRoofFund" REAL NOT NULL DEFAULT 0,
    "monthlyOwnerDrawGoal" REAL NOT NULL DEFAULT 0,
    "openHoursTemplate" TEXT NOT NULL DEFAULT '{"mon":0,"tue":8,"wed":8,"thu":8,"fri":8,"sat":8,"sun":5}',
    "enableTrueHealth" BOOLEAN NOT NULL DEFAULT true,
    "enableSpreading" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DayEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "netSalesExTax" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExpenseTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "vendorId" INTEGER,
    "vendorName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "memo" TEXT,
    "spreadMonths" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "defaultCategory" TEXT NOT NULL,
    "typicalAmount" REAL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT NOT NULL DEFAULT 'NONE',
    "dueDayOfMonth" INTEGER,
    "autopopulateChecklist" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReferenceMonth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "referenceNetSalesExTax" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DayEntry_date_key" ON "DayEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "VendorTemplate_name_key" ON "VendorTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceMonth_year_month_key" ON "ReferenceMonth"("year", "month");
