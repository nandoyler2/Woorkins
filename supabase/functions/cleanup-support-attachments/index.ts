import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bucketId = "support-attachments" } = (await req.json().catch(() => ({ bucketId: "support-attachments" }))) as { bucketId?: string };

    console.log("[cleanup-support-attachments] Starting cleanup for bucket:", bucketId);

    // Check if bucket exists
    const { data: bucket, error: getErr } = await supabase.storage.getBucket(bucketId);
    if (getErr) {
      console.warn("[cleanup-support-attachments] getBucket error:", getErr.message);
    }

    if (!bucket) {
      console.log("[cleanup-support-attachments] Bucket not found, nothing to delete.");
      return new Response(JSON.stringify({ success: true, message: "Bucket not found. Nothing to delete.", bucketId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empty the bucket (best-effort)
    const { error: emptyErr } = await supabase.storage.emptyBucket(bucketId);
    if (emptyErr) {
      console.warn("[cleanup-support-attachments] emptyBucket warning:", emptyErr.message);
    }

    // Delete the bucket
    const { error: delErr } = await supabase.storage.deleteBucket(bucketId);
    if (delErr) {
      console.error("[cleanup-support-attachments] deleteBucket error:", delErr.message);
      return new Response(JSON.stringify({ success: false, error: delErr.message, bucketId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[cleanup-support-attachments] Bucket deleted successfully:", bucketId);
    return new Response(JSON.stringify({ success: true, bucketId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[cleanup-support-attachments] Unexpected error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
