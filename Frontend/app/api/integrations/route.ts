import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";

const providers = [
  "GOOGLE_DRIVE", "GOOGLE_CALENDAR", "MICROSOFT_CALENDAR", "MICROSOFT_ONEDRIVE", "S3_COMPATIBLE",
  "GOOGLE_GMAIL", "MICROSOFT_OUTLOOK", "SMTP",
  "WHATSAPP_CLOUD", "TWILIO_WHATSAPP", "STRIPE", "RAZORPAY",
] as const;
const input = z.object({
  provider: z.enum(providers),
  displayName: z.string().trim().min(2).max(120).optional(),
  configuration: z.record(z.string(), z.unknown()).default({}),
});

type IntegrationRow = {
  id: string;
  provider: string;
  status: string;
  display_name: string;
  configuration: Record<string, unknown>;
  connected_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
};

export async function GET() {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.integrations")) {
      throw new AppError("FORBIDDEN", "You do not have permission to view integrations.", 403);
    }
    const items = await db()<IntegrationRow[]>`select id, provider::text, status::text, display_name, configuration, connected_at, last_checked_at, last_error from integration_connections where workspace_id = ${context.workspaceId} order by provider`;
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.integrations")) {
      throw new AppError("FORBIDDEN", "You do not have permission to configure integrations.", 403);
    }
    const data = input.parse(await request.json());
    const [item] = await db()<IntegrationRow[]>`
      insert into integration_connections (workspace_id, provider, display_name, configuration, status)
      values (${context.workspaceId}, ${data.provider}::integration_provider, ${data.displayName || data.provider.replaceAll("_", " ")}, ${JSON.stringify(data.configuration)}::jsonb, 'PENDING'::integration_status)
      on conflict (workspace_id, provider) do update set
        display_name = excluded.display_name,
        configuration = excluded.configuration,
        status = case when integration_connections.status = 'CONNECTED'::integration_status then 'CONNECTED'::integration_status else 'PENDING'::integration_status end,
        last_error = null
      returning id, provider::text, status::text, display_name, configuration, connected_at, last_checked_at, last_error
    `;
    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error);
  }
}
