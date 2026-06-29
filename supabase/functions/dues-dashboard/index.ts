// dues-dashboard: returns dues summary for a club. Read only; any active club
// member may view it (RLS enforces club scoping). Ledger summary is retrieved
// separately via club_ledger_summary() RPC by the app.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
} from "../_shared/http.ts";
import { requireUuid } from "../_shared/validation.ts";
import { resolveActorMembership } from "../_shared/members.ts";

type DueRow = {
  member_id: string;
  amount_due: number;
  amount_paid: number;
  status: "pending" | "paid" | "overdue" | "waived";
};

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!actor) {
      return errorResponse("You are not an active member of this club", 403);
    }

    const duesResult = await client
      .from("member_dues")
      .select("member_id,amount_due,amount_paid,status")
      .eq("club_id", clubId);

    if (duesResult.error) {
      return errorResponse(duesResult.error.message, 400);
    }

    const dues = (duesResult.data ?? []) as DueRow[];

    const totalBilled = dues.reduce((s, d) => s + Number(d.amount_due), 0);
    const totalCollected = dues.reduce((s, d) => s + Number(d.amount_paid), 0);

    return jsonResponse({
      dues: {
        totalBilled,
        totalCollected,
        totalOutstanding: Math.max(totalBilled - totalCollected, 0),
        paidCount: dues.filter((d) => d.status === "paid").length,
        pendingCount: dues.filter((d) => d.status === "pending").length,
        overdueCount: dues.filter((d) => d.status === "overdue").length,
        waivedCount: dues.filter((d) => d.status === "waived").length,
        collectionPercent:
          totalBilled === 0
            ? 0
            : Math.round((totalCollected / totalBilled) * 100),
      },
    });
  }),
);
