import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
const input = z.object({ billingEmail: z.string().trim().email().max(320), invoiceReference: z.string().trim().min(1).max(80) });

export async function GET() {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.view")) throw new AppError("FORBIDDEN", "You do not have permission to view billing settings.", 403);
    const [item] = await db()<{ billing_email: string | null; invoice_reference: string | null; plan_code: string | null; status: string | null; seat_limit: number | null; current_period_ends_at: string | null; member_count: number }[]>`
      select w.billing_email,w.invoice_reference,s.plan_code,s.status,s.seat_limit,s.current_period_ends_at,
      (select count(*)::int from workspace_memberships where workspace_id=w.id) as member_count
      from workspaces w left join workspace_subscriptions s on s.workspace_id=w.id where w.id=${context.workspaceId}`;
    return NextResponse.json({ item });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.edit")) throw new AppError("FORBIDDEN", "You do not have permission to update billing settings.", 403);
    const data = input.parse(await request.json());
    const [item] = await db()<{ billing_email: string; invoice_reference: string }[]>`update workspaces set billing_email=${data.billingEmail},invoice_reference=${data.invoiceReference} where id=${context.workspaceId} returning billing_email,invoice_reference`;
    return NextResponse.json({ item });
  } catch (error) { return apiError(error); }
}
