type WelcomePayload = {
  email?: string;
  name?: string;
  storeName?: string;
  logoUrl?: string;
  siteUrl?: string;
  installUrl?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function authenticatedEmail(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
    },
  });

  if (!response.ok) return null;
  const user = await response.json();
  return String(user?.email || "").trim().toLowerCase() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sessionEmail = await authenticatedEmail(req);
    if (!sessionEmail) {
      return Response.json({ error: "Sessao autenticada obrigatoria" }, { status: 401, headers: corsHeaders });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("WELCOME_FROM_EMAIL") || "Monte Sinai <onboarding@resend.dev>";
    if (!resendKey) {
      return Response.json({ skipped: true, reason: "RESEND_API_KEY ausente" }, { headers: corsHeaders });
    }

    const payload = (await req.json()) as WelcomePayload;
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      return Response.json({ error: "Email obrigatorio" }, { status: 400, headers: corsHeaders });
    }
    if (email !== sessionEmail) {
      return Response.json({ error: "Email diferente da sessao autenticada" }, { status: 403, headers: corsHeaders });
    }

    const storeName = payload.storeName || "Monte Sinai";
    const name = payload.name || "cliente";
    const siteUrl = payload.siteUrl || "https://monte-sinai.netlify.app/";
    const installUrl = payload.installUrl || siteUrl;
    const logoUrl = payload.logoUrl || `${siteUrl.replace(/\/$/, "")}/assets/brand/monte-sinai-logo-transparente.png`;

    const html = `
      <div style="margin:0;padding:0;background:#061126;font-family:Arial,Helvetica,sans-serif;color:#f8fbff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#061126;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:#0b1d46;">
                <tr>
                  <td style="padding:28px 28px 10px;">
                    <img src="${escapeHTML(logoUrl)}" width="150" alt="${escapeHTML(storeName)}" style="display:block;max-width:150px;height:auto;margin-bottom:24px;">
                    <p style="margin:0 0 8px;color:#ffd400;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Cadastro criado</p>
                    <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.12;">Bem-vindo, ${escapeHTML(name)}.</h1>
                    <p style="margin:16px 0 0;color:#d8e7ff;font-size:16px;line-height:1.6;">Sua conta na ${escapeHTML(storeName)} foi criada. Agora voce pode salvar seus dados, acompanhar pedidos e comprar agua, gas e produtos de limpeza com mais rapidez.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 8px;">
                    <a href="${escapeHTML(siteUrl)}" style="display:block;border-radius:14px;background:#006ee6;color:#ffffff;text-align:center;text-decoration:none;font-size:16px;font-weight:900;padding:15px 18px;">Abrir loja</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;">
                    <a href="${escapeHTML(installUrl)}" style="display:block;border:1px solid rgba(255,212,0,.55);border-radius:14px;color:#ffd400;text-align:center;text-decoration:none;font-size:15px;font-weight:900;padding:14px 18px;">Instalar aplicativo da loja</a>
                    <p style="margin:18px 0 0;color:#96b3dc;font-size:13px;line-height:1.5;">Dica: no celular, abra a loja e toque em "Instalar" ou "Adicionar a tela inicial" quando o navegador sugerir.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `Bem-vindo a ${storeName}`,
        html,
      }),
    });

    if (!response.ok) {
      return Response.json({ error: await response.text() }, { status: 502, headers: corsHeaders });
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500, headers: corsHeaders });
  }
});
