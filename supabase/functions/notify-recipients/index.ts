import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  willId: string;
  willTitle: string;
  ownerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { willId, willTitle, ownerName }: NotifyRequest = await req.json();

    console.log("Notifying recipients for will:", willId);

    // Fetch recipients with email addresses
    const { data: recipients, error: recipientsError } = await supabase
      .from("recipients")
      .select("id, full_name, email")
      .not("email", "is", null);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      console.log("No recipients with email addresses found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No recipients with email addresses" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${recipients.length} recipients to notify`);

    const emailPromises = recipients
      .filter((r) => r.email)
      .map(async (recipient) => {
        try {
          const emailResponse = await resend.emails.send({
            from: "LegacyVault <onboarding@resend.dev>",
            to: [recipient.email!],
            subject: `Important: You've been named in ${ownerName}'s Digital Will`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .logo { font-size: 28px; font-weight: bold; color: #1a1a2e; }
                  .gold { color: #c9a227; }
                  .card { background: #f8f9fa; border-radius: 12px; padding: 30px; margin: 20px 0; }
                  .button { display: inline-block; background: linear-gradient(135deg, #c9a227, #d4af37); color: #1a1a2e; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                  .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">Legacy<span class="gold">Vault</span></div>
                  </div>
                  
                  <h1>Dear ${recipient.full_name},</h1>
                  
                  <p>We're writing to inform you that <strong>${ownerName}</strong> has finalized their digital will titled "<strong>${willTitle}</strong>" and has named you as a recipient.</p>
                  
                  <div class="card">
                    <h3 style="margin-top: 0;">What does this mean?</h3>
                    <p>You have been designated to receive assets or important information as part of this digital will. The specific details of your allocation will be shared with you at the appropriate time.</p>
                  </div>
                  
                  <p>If you have any questions about this notification or need to verify your identity as a recipient, please contact us.</p>
                  
                  <div class="card" style="text-align: center; background: #1a1a2e; color: #fff;">
                    <p style="margin: 0 0 15px 0;">Your legacy matters. Your loved ones matter.</p>
                    <p style="margin: 0; font-size: 12px; color: #888;">This will is securely stored and protected.</p>
                  </div>
                  
                  <div class="footer">
                    <p>This is an automated notification from LegacyVault.</p>
                    <p>© ${new Date().getFullYear()} LegacyVault. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          console.log(`Email sent to ${recipient.email}:`, emailResponse);
          return { success: true, email: recipient.email, id: emailResponse.data?.id };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to send email to ${recipient.email}:`, error);
          return { success: false, email: recipient.email, error: errorMessage };
        }
      });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;

    console.log(`Successfully sent ${successCount} of ${results.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: results.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-recipients function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
