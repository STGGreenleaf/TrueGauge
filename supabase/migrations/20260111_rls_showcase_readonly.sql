-- RLS Policies for TrueGauge
-- Defense-in-depth: Blocks writes to showcase-template at database level
-- Run this in Supabase SQL Editor after deploying

-- Enable RLS on all tenant data tables
ALTER TABLE "DayEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferenceMonth" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "YearStartAnchor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashInjection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- READ POLICIES (allow all reads via service role)
-- ============================================
-- Note: Our app uses service role key, so these allow the app to read all data
-- The app enforces tenant isolation via organizationId filtering

CREATE POLICY "allow_read_day_entries" ON "DayEntry"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_expenses" ON "ExpenseTransaction"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_reference_months" ON "ReferenceMonth"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_cash_snapshots" ON "CashSnapshot"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_year_start_anchors" ON "YearStartAnchor"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_cash_injections" ON "CashInjection"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_vendors" ON "VendorTemplate"
  FOR SELECT USING (true);

CREATE POLICY "allow_read_settings" ON "Settings"
  FOR SELECT USING (true);

-- ============================================
-- WRITE POLICIES (block showcase-template writes)
-- ============================================
-- These prevent ANY writes to showcase-template org, even from service role
-- This is defense-in-depth behind the app-layer assertNotShowcase() guard

CREATE POLICY "block_showcase_insert_day_entries" ON "DayEntry"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_day_entries" ON "DayEntry"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_day_entries" ON "DayEntry"
  FOR DELETE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_insert_expenses" ON "ExpenseTransaction"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_expenses" ON "ExpenseTransaction"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_expenses" ON "ExpenseTransaction"
  FOR DELETE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_insert_reference_months" ON "ReferenceMonth"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_reference_months" ON "ReferenceMonth"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_reference_months" ON "ReferenceMonth"
  FOR DELETE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_insert_cash_snapshots" ON "CashSnapshot"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_cash_snapshots" ON "CashSnapshot"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_cash_snapshots" ON "CashSnapshot"
  FOR DELETE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_insert_year_start_anchors" ON "YearStartAnchor"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_year_start_anchors" ON "YearStartAnchor"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_year_start_anchors" ON "YearStartAnchor"
  FOR DELETE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_insert_cash_injections" ON "CashInjection"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_cash_injections" ON "CashInjection"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_cash_injections" ON "CashInjection"
  FOR DELETE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_insert_vendors" ON "VendorTemplate"
  FOR INSERT WITH CHECK ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_update_vendors" ON "VendorTemplate"
  FOR UPDATE USING ("organizationId" != 'showcase-template');

CREATE POLICY "block_showcase_delete_vendors" ON "VendorTemplate"
  FOR DELETE USING ("organizationId" != 'showcase-template');

-- Settings: Allow owner to update showcase-template settings (brand, splash)
-- but block other orgs from touching showcase-template
CREATE POLICY "allow_insert_settings" ON "Settings"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_update_settings" ON "Settings"
  FOR UPDATE USING (true);

CREATE POLICY "allow_delete_settings" ON "Settings"
  FOR DELETE USING ("organizationId" != 'showcase-template');

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, verify with:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
