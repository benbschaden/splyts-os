-- Product roadmap items: Now / Next / Later / Shipped kanban
CREATE TABLE product_roadmap_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  phase           TEXT NOT NULL CHECK (phase IN ('now', 'next', 'later', 'shipped')),
  status          TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'in_progress', 'shipped', 'cut')),
  category        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX product_roadmap_org_phase_idx
  ON product_roadmap_items (organization_id, phase) WHERE deleted_at IS NULL;

ALTER TABLE product_roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view roadmap items"
  ON product_roadmap_items FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert roadmap items"
  ON product_roadmap_items FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update roadmap items"
  ON product_roadmap_items FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete roadmap items"
  ON product_roadmap_items FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
