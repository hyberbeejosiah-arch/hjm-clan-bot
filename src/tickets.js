const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const OPEN_ID = "hjm_ticket_open";
const CLOSE_ID = "hjm_ticket_close";
const CATEGORY_NAME = "🎫 TICKETS";
const STAFF_ROLES = ["🔨 Moderator", "⚔️ Admin", "🛡️ Head Admin", "💎 Director", "🔱 Co-Founder", "👑 Founder"];

const MEMBER_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
];

async function sendPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🎫 HJM Support Tickets")
    .setDescription("Need help, want to report something, or have a question for staff?\nPress the button below to open a private ticket.")
    .setColor(0x7B2CBF);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(OPEN_ID).setLabel("Open Ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary)
  );
  await interaction.channel.send({ embeds: [embed], components: [row] });
  return interaction.reply({ content: "Ticket panel posted.", ephemeral: true });
}

async function openTicket(interaction) {
  const guild = interaction.guild;
  await interaction.deferReply({ ephemeral: true });

  const existing = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.topic === `ticket:${interaction.user.id}`
  );
  if (existing) {
    return interaction.editReply(`You already have an open ticket: ${existing}`);
  }

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

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CLOSE_ID).setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
  );
  await channel.send({
    content: `${interaction.user} welcome. Staff will be with you shortly. Describe what you need below.`,
    components: [row],
  });
  return interaction.editReply(`Your ticket is ready: ${channel}`);
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
  await interaction.reply(`🔒 Ticket closed by ${interaction.user}. This channel will be deleted in 5 seconds.`);
  setTimeout(() => channel.delete("Ticket closed").catch(console.error), 5000);
}

async function handleTicketInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === OPEN_ID) { await openTicket(interaction); return true; }
    if (interaction.customId === CLOSE_ID) { await closeTicket(interaction); return true; }
  }
  return false;
}

module.exports = { sendPanel, handleTicketInteraction };
