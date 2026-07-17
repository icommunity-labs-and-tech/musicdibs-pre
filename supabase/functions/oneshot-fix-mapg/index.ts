import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SIG_ROW_ID = "84c4f511-b556-4b46-b927-976b97728849";
  const IBS_SIG_ID_TO_DELETE = "sig_ZDHuVeJVcHy3VnyjX3V6bc";
  const IBS_SIG_ID_TO_KEEP = "sig_62ASFmpDkMzjdxAsEQf845";
  const USER_ID = "1a3b50d8-704e-4694-b9a4-13f89e133d46";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const out: any = {};

  // 1. iBS DELETE
  try {
    const res = await fetch(`https://api.icommunitylabs.com/v2/signatures/${IBS_SIG_ID_TO_DELETE}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("IBS_API_KEY")}`,
        "Content-Type": "application/json",
      },
    });
    out.ibs_status = res.status;
    if (!res.ok && res.status !== 404) {
      out.ibs_error = (await res.text()).slice(0, 500);
      return new Response(JSON.stringify(out), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e: any) {
    out.ibs_error = String(e?.message || e);
    return new Response(JSON.stringify(out), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 2. Reassign profile
  const { error: profErr } = await admin.from("profiles").update({
    ibs_signature_id: IBS_SIG_ID_TO_KEEP,
    updated_at: new Date().toISOString(),
  }).eq("user_id", USER_ID);
  out.profile_updated = !profErr;
  if (profErr) out.profile_error = profErr.message;

  // 3. Delete signature row
  const { error: delErr } = await admin.from("ibs_signatures").delete().eq("id", SIG_ROW_ID);
  out.sig_deleted = !delErr;
  if (delErr) out.sig_delete_error = delErr.message;

  return new Response(JSON.stringify({ success: true, ...out }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
