// AI assistant for ticket channels (OpenAI-compatible chat API, no extra deps).
const BASE = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const SYSTEM = process.env.AI_SYSTEM_PROMPT ||
  "You are the HJM Clan support assistant, answering inside a private support ticket on the HJM Clan Discord. " +
  "Answer every question the member asks clearly and concisely. If it needs a decision or action from staff " +
  "(bans, applications, partnerships), say staff will follow up. Never invent clan rules or facts you were not given.";

const enabled = () => !!process.env.AI_API_KEY;

async function chat(messages) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!res.ok) throw new Error(`AI API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).choices[0].message.content;
}

const ticketOwner = ch => (ch?.topic?.startsWith("ticket:") ? ch.topic.slice(7) : null);

async function handleTicketMessage(client, m) {
  if (!enabled() || m.author.bot || !m.guild || !ticketOwner(m.channel) || !m.content) return;
  try {
    await m.channel.sendTyping();
    const hist = [...(await m.channel.messages.fetch({ limit: 20 })).values()].reverse()
      .filter(x => x.content)
      .map(x => x.author.id === client.user.id
        ? { role: "assistant", content: x.content }
        : { role: "user", content: `${x.author.username}: ${x.content}` });
    const reply = await chat([{ role: "system", content: SYSTEM }, ...hist]);
    await m.reply({ content: reply.slice(0, 1990), allowedMentions: { parse: [], repliedUser: false } });
  } catch (e) {
    console.error("AI reply failed:", e.message);
  }
}

async function summarize(channel) {
  if (!enabled()) return null;
  try {
    const msgs = [...(await channel.messages.fetch({ limit: 100 })).values()].reverse().filter(x => x.content);
    const text = msgs.map(x => `${x.author.username}: ${x.content}`).join("\n").slice(0, 12000);
    if (!text) return null;
    return await chat([
      { role: "system", content: "Summarize this support ticket in 3-5 short lines: the issue and how it was resolved." },
      { role: "user", content: text },
    ]);
  } catch (e) {
    console.error("AI summary failed:", e.message);
    return null;
  }
}

module.exports = { handleTicketMessage, summarize };
