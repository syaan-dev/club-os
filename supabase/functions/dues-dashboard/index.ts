// dues-dashboard: returns an aggregated dues + ledger summary for a club. Read
// only; any active club member may view it (RLS enforces club scoping).
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

type TxRow = { type: "income" | "expense"; amount: number };

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!actor) {
      return errorResponse("You are not an active member of this club", 403);
    }

    const [duesResult, txResult] = await Promise.all([
      client
        .from("member_dues")
        .select("member_id,amount_due,amount_paid,status")
        .eq("club_id", clubId),
      client
        .from("transactions")
        .select("type,amount")
        .eq("club_id", clubId)
        .eq("status", "completed"),
    ]);

    if (duesResult.error) {
      return errorResponse(duesResult.error.message, 400);
    }

    const dues = (duesResult.data ?? []) as DueRow[];
    const txs = (txResult.data ?? []) as TxRow[];

    const totalBilled = dues.reduce((s, d) => s + Number(d.amount_due), 0);
    const totalCollected = dues.reduce((s, d) => s + Number(d.amount_paid), 0);

    const income = txs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);

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
      ledger: {
        income,
        expense,
        net: income - expense,
      },
    });
  }),
);
