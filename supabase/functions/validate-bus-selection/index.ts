import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, schedule_id, selected_date } = await req.json();

        if (!user_id || !schedule_id || !selected_date) {
            return new Response(JSON.stringify({ error: "Missing parameters" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Get schedule info
        const { data: schedule, error: sErr } = await supabase
            .from("schedules")
            .select("departure_time, route_id")
            .eq("id", schedule_id)
            .single();

        if (sErr || !schedule) {
            return new Response(JSON.stringify({ error: "Horario no encontrado" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Validate time if selected_date is today (UTC-3)
        const now = new Date();

        // Get current time in America/Argentina/Buenos_Aires (UTC-3)
        const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // sv-SE format is roughly YYYY-MM-DD HH:mm:ss
        const formatted = formatter.format(now);
        const [todayStr, timeStr] = formatted.split(' ');
        const [currentHours, currentMinutes] = timeStr.split(':').map(Number);

        if (selected_date === todayStr) {
            const [depHours, depMinutes] = schedule.departure_time.split(":").map(Number);

            // Calculate current total minutes of the day
            const currentTotalMinutes = currentHours * 60 + currentMinutes;
            // Calculate departure total minutes + 10 mins grace
            const limitTotalMinutes = depHours * 60 + depMinutes + 10;

            if (currentTotalMinutes > limitTotalMinutes) {
                return new Response(
                    JSON.stringify({ error: "AUTOBUS_YA_SALIO" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // 3. Insert or update selection
        const { data, error: iErr } = await supabase
            .from("user_selections")
            .upsert({
                user_id,
                schedule_id,
                route_id: schedule.route_id,
                selected_date,
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (iErr) throw iErr;

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
