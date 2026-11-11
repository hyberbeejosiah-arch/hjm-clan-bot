const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const { summarize } = require("./ai");

const OPEN_ID = "hjm_ticket_open";
const CLOSE_ID = "hjm_ticket_close";
const COUNTDOWN = 5;
const CATEGORY_NAME = "🎫 TICKETS";
const STAFF_ROLES = ["🔨 Moderator", "⚔️ Admin", "🛡️ Head Admin", "💎 Director", "🔱 Co-Founder", "👑 Founder"];

const MEMBER_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sendPanel(interaction) {
  const embed = new EmbedBuilder()
    .setAuthor({ name: "HJM CLAN  •  SUPPORT CENTER" })
    .setTitle("🎫  Need help? Open a ticket")
    .setDescription(
      "```fix\nPrivate. Fast. Straight to staff.\n```\n" +
      "**What tickets are for**\n" +
      "> 🛡️  Reports and issues\n" +
      "> 📝  Clan applications and questions\n" +
      "> 🤝  Partnerships and anything else\n\n" +
      "Press **Open Ticket** below. A private channel is created for you and staff are pinged instantly."
    )
    .setColor(0x7B2CBF)
    .setThumbnail(interaction.guild.iconURL({ size: 256 }))
    .setFooter({ text: "HJM Clan  •  One ticket per member" })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(OPEN_ID).setLabel("Open Ticket").setEmoji("🎫").setStyle(ButtonStyle.Success)
  );
  await interaction.channel.send({ embeds: [embed], components: [row] });
  return interaction.reply({ content: "Ticket panel posted.", ephemeral: true });
}

async function openTicket(interaction) {
  const state = {};
  try {
    return await openTicketInner(interaction, state);
  } finally {
    clearInterval(state.spin);
  }
}

async function openTicketInner(interaction, state) {
  const guild = interaction.guild;
  await interaction.deferReply({ ephemeral: true });

  const existing = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.topic === `ticket:${interaction.user.id}`
  );
  if (existing) {
    return interaction.editReply(`You already have an open ticket: ${existing}`);
  }

  const frames = ["🔄 Creating your ticket", "🔄 Creating your ticket.", "🔄 Creating your ticket..", "🔄 Creating your ticket..."];
  let frame = 0;
  const spin = state.spin = setInterval(() => interaction.editReply(frames[++frame % frames.length]).catch(() => {}), 800);

  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME);
  if (!category) {
    category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }],
    });
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: MEMBER_ALLOW },
    { id: guild.members.me.id, allow: [...MEMBER_ALLOW, PermissionFlagsBits.ManageChannels] },
  ];
  for (const name of STAFF_ROLES) {
    const role = guild.roles.cache.find(r => r.name === name);
    if (role) overwrites.push({ id: role.id, allow: MEMBER_ALLOW });
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";
  const channel = await guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket:${interaction.user.id}`,
    permissionOverwrites: overwrites,
  });

  clearInterval(spin);

  const staffPings = [];
  for (const name of ["👑 Founder", ...STAFF_ROLES]) {
    const role = guild.roles.cache.find(r => r.name === name);
    if (role && !staffPings.includes(role.id)) staffPings.push(role.id);
  }
  const pingText = staffPings.map(id => `<@&${id}>`).join(" ");

  const embed = new EmbedBuilder()
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setTitle("🎫  Ticket opened")
    .setDescription(
      `Welcome ${interaction.user}, thanks for reaching out.\n\n` +
      "```fix\nDescribe what you need below. Staff have been notified.\n```"
    )
    .addFields(
      { name: "Opened by", value: `${interaction.user}`, inline: true },
      { name: "Opened", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: "Status", value: "🟢 Waiting for staff", inline: true }
    )
    .setColor(0x57F287)
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CLOSE_ID).setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
  );
  await channel.send({
    content: `🔔 ${pingText || "Staff"} — new ticket from ${interaction.user}`,
    embeds: [embed],
    components: [row],
    allowedMentions: { roles: staffPings, users: [interaction.user.id] },
  });
  return interaction.editReply(`✅ Your ticket is ready: ${channel}`);
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const ownerId = channel.topic?.startsWith("ticket:") ? channel.topic.slice(7) : null;
  if (!ownerId) {
    return interaction.reply({ content: "This isn't a ticket channel.", ephemeral: true });
  }
  const isOwner = interaction.user.id === ownerId;
  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
  if (!isOwner && !isStaff) {
    return interaction.reply({ content: "Only the ticket owner or staff can close this ticket.", ephemeral: true });
  }
  await interaction.update({ components: [] }).catch(() => {});
  return runClose(channel, ownerId, interaction.user, interaction.client);
}

// Close by typing in the ticket channel (e.g. "close the ticket").
const CLOSE_RE = /^\W*(please\s+)?(close|finish|end)\b.{0,25}\bticket\b|^\W*(please\s+)?close( it| this)?\W*$/i;

async function closeTicketFromMessage(message) {
  const channel = message.channel;
  const ownerId = channel.topic?.startsWith("ticket:") ? channel.topic.slice(7) : null;
  if (!ownerId || message.author.bot || !CLOSE_RE.test(message.content || "")) return false;
  const isStaff = message.member?.permissions.has(PermissionFlagsBits.ManageMessages);
  if (message.author.id !== ownerId && !isStaff) return false;
  await runClose(channel, ownerId, message.author, message.client);
  return true;
}

async function runClose(channel, ownerId, closer, client) {
  const render = n => new EmbedBuilder()
    .setTitle("🔒  Ticket closing")
    .setDescription(`Closed by ${closer}.\n\n**Deleting in ${n}...**\n${"🟥".repeat(n)}${"⬛".repeat(COUNTDOWN - n)}`)
    .setColor(0xED4245);
  const msg = await channel.send({ embeds: [render(COUNTDOWN)] });
  for (let n = COUNTDOWN - 1; n >= 1; n--) {
    await sleep(1000);
    await msg.edit({ embeds: [render(n)] }).catch(() => {});
  }
  const summary = await summarize(channel);
  const dm = `Your ticket **#${channel.name}** in **${channel.guild.name}** was closed by ${closer}.` +
    (summary ? `\n\n**Summary**\n${summary}` : "");
  for (const id of new Set([ownerId, closer.id])) {
    try { await (await client.users.fetch(id)).send(dm.slice(0, 1990)); }
    catch (e) { console.error("Ticket DM failed for", id, e.message); }
  }
  await sleep(1000);
  await channel.delete("Ticket closed").catch(console.error);
}

async function handleTicketInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === OPEN_ID) { await openTicket(interaction); return true; }
    if (interaction.customId === CLOSE_ID) { await closeTicket(interaction); return true; }
  }
  return false;
}

module.exports = { sendPanel, handleTicketInteraction, closeTicketFromMessage };
