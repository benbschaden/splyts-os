import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationForUser } from '@/lib/queries/organizations'
import {
  getBrandContext,
  updateBrandAssets,
  type BrandAssets,
} from '@/lib/queries/brand-context'
import { isAtLeastAdmin } from '@/lib/auth/roles'

const brandAssetsPatchSchema = z.object({
  logo_url: z.string().optional(),
  logo_mark_url: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  font_display: z.string().optional(),
  font_body: z.string().optional(),
  image_style: z.string().optional(),
  social_handles: z.string().optional(),
})

function normalizeBrandAssets(raw: unknown): BrandAssets {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {}
  }
  return raw as BrandAssets
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })

    const brandContext = await getBrandContext(org.id)
    const assets = normalizeBrandAssets(brandContext?.brand_assets ?? {})
    return Response.json({ data: assets })
  } catch (e) {
    console.error('[brand-assets] GET:', e)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const org = await getOrganizationForUser(user.id)
    if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!isAtLeastAdmin(org.role)) return Response.json({ error: 'Not found' }, { status: 404 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = brandAssetsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const existingRow = await getBrandContext(org.id)
    if (!existingRow) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const existing = normalizeBrandAssets(existingRow.brand_assets)
    const merged: BrandAssets = { ...existing, ...parsed.data }

    const { brandAssets, error } = await updateBrandAssets(org.id, merged)
    if (error || !brandAssets) {
      return Response.json({ error: error ?? 'Failed to save' }, { status: 500 })
    }

    return Response.json({ data: brandAssets })
  } catch (e) {
    console.error('[brand-assets] PATCH:', e)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
