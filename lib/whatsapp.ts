const WHATSAPP_API_BASE = "https://graph.facebook.com/v18.0";

export type WhatsAppTemplateParameter = string;

export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  parameters: WhatsAppTemplateParameter[]
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn("WhatsApp environment variables are not configured.");
    return;
  }

  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en_US"
      },
      components: [
        {
          type: "body",
          parameters: parameters.map((value) => ({
            type: "text",
            text: value
          }))
        }
      ]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to send WhatsApp message", res.status, text);
    throw new Error("WhatsApp API error");
  }
}

