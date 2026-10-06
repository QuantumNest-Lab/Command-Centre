import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";

const input = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(240).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  website: z.string().trim().url().max(2048).optional().or(z.literal("")),
  taxId: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  locale: z.string().trim().min(2).max(20).optional(),
  currency: z.string().trim().length(3).optional(),
  documentLegalName: z.string().trim().max(240).optional(),
  documentTaxId: z.string().trim().max(80).optional(),
  documentCurrency: z.string().trim().length(3).optional(),
  documentTimezone: z.string().trim().max(80).optional(),
  logoUrl: z.string().trim().max(2048).optional().or(z.literal("")),
});

export async function GET() {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.view")) throw new AppError("FORBIDDEN", "You do not have permission to view company settings.", 403);
    const [row] = await db()<{ name: string; legal_name: string | null; business_email: string | null; business_phone: string | null; business_address: string | null; business_city: string | null; business_state: string | null; business_postal_code: string | null; website: string | null; tax_id: string | null; timezone: string | null; locale: string | null; currency: string | null; logo_url: string | null }[]>`
      select name, legal_name, business_email, business_phone, business_address, business_city, business_state, business_postal_code, website, tax_id, timezone, locale, currency, logo_url
      from workspaces where id=${context.workspaceId}`;
    if (!row) throw new AppError("NOT_FOUND", "Workspace not found.", 404);
    return NextResponse.json({
      workspace: {
        name: row.name,
        legalName: row.legal_name || "",
        email: row.business_email || "",
        phone: row.business_phone || "",
        address: row.business_address || "",
        city: row.business_city || "",
        state: row.business_state || "",
        postalCode: row.business_postal_code || "",
        website: row.website || "",
        taxId: row.tax_id || "",
        timezone: row.timezone || "",
        locale: row.locale || "",
        currency: row.currency || "",
        logoUrl: row.logo_url || "",
      },
      document: {
        legalName: row.legal_name || "Quantum Nest Lab Private Limited",
        taxId: row.tax_id || "29ABCDE1234F1Z5",
        currency: row.currency ? `${row.currency} – ${currencyLabel(row.currency)}` : "INR – Indian Rupee (₹)",
        timezone: row.timezone || "(GMT+05:30) Asia/Kolkata",
      },
    });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.edit")) throw new AppError("FORBIDDEN", "You do not have permission to update company settings.", 403);
    const data = input.parse(await request.json());
    await db()`update workspaces set name=${data.name}, legal_name=${data.legalName || null}, business_email=${data.email}, business_phone=${data.phone || null}, business_address=${data.address || null}, business_city=${data.city || null}, business_state=${data.state || null}, business_postal_code=${data.postalCode || null}, website=${data.website || null}, tax_id=${data.taxId || null}, timezone=${data.timezone || 'UTC'}, locale=${data.locale || 'en'}, currency=${data.currency?.toUpperCase() || 'INR'}, logo_url=${data.logoUrl || null}, updated_at=now() where id=${context.workspaceId}`;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

function currencyLabel(code: string): string {
  const map: Record<string, string> = {
    INR: "Indian Rupee (₹)",
    USD: "US Dollar ($)",
    EUR: "Euro (€)",
    GBP: "British Pound (£)",
    AED: "UAE Dirham (د.إ)",
  };
  return map[code] || code;
}