require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
} = require("discord.js");
const { sendPanel, handleTicketInteraction } = require("./tickets");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const ROLE_DEFS = [
  { name: "👑 Founder", color: 0xC00000, hoist: true, permissions: [
    PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageEvents
  ]},
  { name: "🔱 Co-Founder", color: 0xA30000, hoist: true, permissions: [
    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageEvents
  ]},
  { name: "💎 Director", color: 0x7B2CBF, hoist: true, permissions: [
    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageEvents
  ]},
  { name: "🛡️ Head Admin", color: 0xE63946, hoist: true, permissions: [
    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.ViewAuditLog
  ]},
  { name: "⚔️ Admin", color: 0xF15A24, hoist: true, permissions: [
    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ViewAuditLog
  ]},
  { name: "🔨 Moderator", color: 0xD97706, hoist: true, permissions: [
    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers
  ]},
  { name: "🧪 Trial Moderator", color: 0xE9A23B, hoist: true, permissions: [
    PermissionFlagsBits.ManageMessages
  ]},
  { name: "📣 Event Manager", color: 0x00A6A6, hoist: true, permissions: [
    PermissionFlagsBits.ManageEvents
  ]},
  { name: "🎯 Recruiter", color: 0x2A9D8F, hoist: true, permissions: [] },
  { name: "🏆 Competitive", color: 0xD4AF37, hoist: true, permissions: [] },
  { name: "💠 Elite", color: 0x3A86FF, hoist: true, permissions: [] },
  { name: "✅ Member", color: 0x43AA8B, hoist: true, permissions: [] },
  { name: "🧩 Trial Member", color: 0x90BE6D, hoist: false, permissions: [] },
  { name: "👀 Guest", color: 0x8D99AE, hoist: false, permissions: [] },
  { name: "🔇 Muted", color: 0x555555, hoist: false, permissions: [] },
];

const ROLE_NAMES = ROLE_DEFS.map(r => r.name);

function allow(...permissions) { return permissions; }
function deny(...permissions) { return permissions; }

async function ensureRole(guild, def) {
  let role = guild.roles.cache.find(r => r.name === def.name);
  if (!role) {
    role = await guild.roles.create({
      name: def.name,
      color: def.color,
      hoist: def.hoist,
      permissions: def.permissions,
      reason: "HJM Clan Bot role setup",
    });
  } else {
    // Update only roles created/managed by this setup, not unrelated server roles.
    await role.edit({
      color: def.color,
      hoist: def.hoist,
      permissions: def.permissions,
      reason: "Update HJM clan role colors and permissions",
    });
  }
  return role;
}

async function ensureCategory(guild, name, overwrites) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites,
      reason: "HJM Clan Bot server setup",
    });
  } else {
    await category.permissionOverwrites.set(overwrites, "Apply HJM category permissions");
  }
  return category;
}

async function ensureTextChannel(guild, name, parent, overwrites, topic) {
  let channel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === name
  );
  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: parent.id,
      topic,
      permissionOverwrites: overwrites,
      reason: "HJM Clan Bot server setup",
    });
  } else {
    await channel.setParent(parent.id, { lockPermissions: false, reason: "Organize HJM clan channels" });
    await channel.permissionOverwrites.set(overwrites, "Apply HJM channel permissions");
    if (topic) await channel.setTopic(topic);
  }
  return channel;
}

async function ensureVoiceChannel(guild, name, parent, overwrites) {
  let channel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildVoice && c.name === name
  );
  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: parent.id,
      permissionOverwrites: overwrites,
      reason: "HJM Clan Bot voice setup",
    });
  } else {
    await channel.setParent(parent.id, { lockPermissions: false, reason: "Organize HJM voice channels" });
    await channel.permissionOverwrites.set(overwrites, "Apply HJM voice permissions");
  }
  return channel;
}

function buildOverwrites(guild, roles, config) {
  const everyone = {
    id: guild.roles.everyone.id,
    type: OverwriteType.Role,
    allow: config.everyoneAllow || [],
    deny: config.everyoneDeny || [],
  };
  const list = [everyone];
  for (const [roleName, perms] of Object.entries(config.roles || {})) {
    const role = roles.get(roleName);
    if (!role) continue;
    list.push({
      id: role.id,
      type: OverwriteType.Role,
      allow: perms.allow || [],
      deny: perms.deny || [],
    });
  }
  return list;
}

async function setupClan(guild, createVoice = true) {
  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) ||
      !guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("I need Manage Roles and Manage Channels. Move my bot role above the HJM roles it manages.");
  }

  const roles = new Map();
  for (const def of ROLE_DEFS) roles.set(def.name, await ensureRole(guild, def));

  // Place the bot's own role above the new clan roles in Server Settings > Roles if needed.
  // Discord will not let a bot move roles above its highest role.

  const memberView = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];
  const memberChat = [...memberView, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles];
  const staffView = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];
  const staffChat = [...staffView, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles];

  const info = await ensureCategory(guild, "📌 INFORMATION", buildOverwrites(guild, roles, {
    everyoneAllow: memberView,
    roles: {
      "👀 Guest": { allow: memberView },
      "🧩 Trial Member": { allow: memberView },
      "✅ Member": { allow: memberView },
    }
  }));

  const community = await ensureCategory(guild, "💬 COMMUNITY", buildOverwrites(guild, roles, {
    everyoneAllow: memberView,
    roles: {
      "👀 Guest": { allow: memberChat },
      "🧩 Trial Member": { allow: memberChat },
      "✅ Member": { allow: memberChat },
      "💠 Elite": { allow: memberChat },
      "🏆 Competitive": { allow: memberChat },
      "🎯 Recruiter": { allow: memberChat },
      "📣 Event Manager": { allow: memberChat },
    }
  }));

  const competitive = await ensureCategory(guild, "🏆 COMPETITIVE", buildOverwrites(guild, roles, {
    everyoneDeny: [PermissionFlagsBits.ViewChannel],
    roles: {
      "🏆 Competitive": { allow: memberChat },
      "💠 Elite": { allow: memberChat },
      "✅ Member": { allow: memberView },
      "🎯 Recruiter": { allow: memberView },
      "📣 Event Manager": { allow: memberView },
      "🔨 Moderator": { allow: staffView },
      "⚔️ Admin": { allow: staffView },
      "🛡️ Head Admin": { allow: staffView },
      "💎 Director": { allow: staffView },
      "🔱 Co-Founder": { allow: staffView },
      "👑 Founder": { allow: staffView },
    }
  }));

  const staff = await ensureCategory(guild, "🔒 STAFF HQ", buildOverwrites(guild, roles, {
    everyoneDeny: [PermissionFlagsBits.ViewChannel],
    roles: {
      "🧪 Trial Moderator": { allow: staffView },
      "🔨 Moderator": { allow: staffChat },
      "⚔️ Admin": { allow: staffChat },
      "🛡️ Head Admin": { allow: staffChat },
      "💎 Director": { allow: staffChat },
      "🔱 Co-Founder": { allow: staffChat },
      "👑 Founder": { allow: staffChat },
      "📣 Event Manager": { allow: staffView },
      "🎯 Recruiter": { allow: staffView },
    }
  }));

  const channels = [
    [info, "welcome", "Welcome and start here."],
    [info, "rules", "Read the HJM Clan rules."],
    [info, "announcements", "Official HJM Clan announcements."],
    [info, "clan-info", "Clan information, ranks, and requirements."],
    [community, "general-chat", "Chat with the HJM community."],
    [community, "bot-commands", "Use HJM Clan Bot commands here."],
    [community, "recruitment", "Recruitment and applications."],
    [community, "roster", "Clan roster and member updates."],
    [community, "clips-and-highlights", "Share your best gameplay clips."],
    [community, "events-and-scrims", "Clan events, scrims, and match planning."],
  ];

  for (const [parent, name, topic] of channels) {
    const overwrites = parent === info
      ? buildOverwrites(guild, roles, {
          everyoneAllow: memberView,
          roles: {
            "👀 Guest": { allow: memberView },
            "🧩 Trial Member": { allow: memberView },
            "✅ Member": { allow: memberView },
          }
        })
      : buildOverwrites(guild, roles, {
          everyoneAllow: memberView,
          roles: {
            "👀 Guest": { allow: memberChat },
            "🧩 Trial Member": { allow: memberChat },
            "✅ Member": { allow: memberChat },
            "💠 Elite": { allow: memberChat },
            "🏆 Competitive": { allow: memberChat },
            "🎯 Recruiter": { allow: memberChat },
            "📣 Event Manager": { allow: memberChat },
          }
        });
    await ensureTextChannel(guild, name, parent, overwrites, topic);
  }

  const staffChannels = [
    ["staff-chat", "Private staff coordination."],
    ["staff-announcements", "Staff-only updates."],
    ["staff-logs", "Staff activity and administration logs."],
    ["mod-logs", "Moderation notes and incident records."],
    ["staff-commands", "Staff bot commands."],
  ];
  for (const [name, topic] of staffChannels) {
    await ensureTextChannel(
      guild, name, staff,
      buildOverwrites(guild, roles, {
        everyoneDeny: [PermissionFlagsBits.ViewChannel],
        roles: {
          "🧪 Trial Moderator": { allow: staffView },
          "🔨 Moderator": { allow: staffChat },
          "⚔️ Admin": { allow: staffChat },
          "🛡️ Head Admin": { allow: staffChat },
          "💎 Director": { allow: staffChat },
          "🔱 Co-Founder": { allow: staffChat },
          "👑 Founder": { allow: staffChat },
          "📣 Event Manager": { allow: staffView },
          "🎯 Recruiter": { allow: staffView },
        }
      }),
      topic
    );
  }

  if (createVoice) {
    const voice = await ensureCategory(guild, "🔊 VOICE", buildOverwrites(guild, roles, {
      everyoneAllow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      roles: {
        "👀 Guest": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        "🧩 Trial Member": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        "✅ Member": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
      }
    }));
    const voicePerms = buildOverwrites(guild, roles, {
      everyoneAllow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      roles: {
        "👀 Guest": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        "🧩 Trial Member": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        "✅ Member": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
      }
    });
    for (const name of ["Clan Lobby", "Squad 1", "Squad 2", "Competitive Team"]) {
      await ensureVoiceChannel(guild, name, voice, voicePerms);
    }
    const staffVoice = await ensureVoiceChannel(
      guild, "Staff Voice", voice,
      buildOverwrites(guild, roles, {
        everyoneDeny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        roles: {
          "🔨 Moderator": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          "⚔️ Admin": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          "🛡️ Head Admin": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          "💎 Director": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          "🔱 Co-Founder": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          "👑 Founder": { allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        }
      })
    );
  }

  return { roleCount: ROLE_DEFS.length, channelCount: channels.length + staffChannels.length + (createVoice ? 4 : 0) };
}

client.once("ready", () => {
  console.log(`HJM Clan Bot online as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  try {
    if (await handleTicketInteraction(interaction)) return;
  } catch (error) {
    console.error(error);
    const msg = "Something went wrong with the ticket. Check the bot has Manage Channels.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
    else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ticket-panel") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You need **Manage Server** to post the ticket panel.", ephemeral: true });
    }
    try {
      return await sendPanel(interaction);
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Couldn't post the panel here. Check the bot can send messages in this channel.", ephemeral: true });
    }
  }

  if (interaction.commandName === "ping") {
    return interaction.reply({ content: "🏓 HJM Clan Bot is online!", ephemeral: true });
  }

  if (interaction.commandName === "help") {
    return interaction.reply({
      content: "**HJM Clan Bot commands**\n`/ping` — check bot status\n`/help` — show this help\n`/ticket-panel` — post the ticket panel in this channel (Manage Server required)\n`/setup-clan` — create/update HJM clan roles, colors, categories, channels, and permissions (Manage Server required).",
      ephemeral: true
    });
  }

  if (interaction.commandName === "setup-clan") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You need **Manage Server** to run this setup.", ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const createVoice = interaction.options.getBoolean("create-voice") ?? true;
      const result = await setupClan(interaction.guild, createVoice);
      await interaction.editReply(
        `✅ HJM setup finished. Created/updated **${result.roleCount} roles** and organized the clan channels with role-based permissions.\n\n` +
        `**Important:** I did not delete any channels or roles. Check the role order in Server Settings → Roles and keep the bot's role above the roles it manages.`
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply(`⚠️ Setup could not finish: ${error.message}\nCheck that the bot has Manage Roles and Manage Channels, and that its role is above the roles it needs to manage.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);