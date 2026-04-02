-- Migration: Add 'owner' role to member_role enum
-- Owner is a superset of admin with access to business plan editing and activity reports.

ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'owner' BEFORE 'admin';
