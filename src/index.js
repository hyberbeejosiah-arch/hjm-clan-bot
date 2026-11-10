require("dotenv").config();
const {
  Client, GatewayIntentBits, Events, ChannelType, PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("DISCORD_TOKEN is missing. Add it to .env locally or Railway Variables.");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, readyClient => {
  console.log(`HJM Clan Bot online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    return interaction.reply({ content: `HJM Clan Bot is online. Latency: ${client.ws.ping}ms`, ephemeral: true });
  }

  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(0xed171f)
      .setTitle("HJM Clan Bot")
      .setDescription("Official HJM Clan server bot.")
      .addFields(
        { name: "/ping", value: "Check bot status.", inline: true },
        { name: "/help", value: "Show this help menu.", inline: true },
        { name: "/setup-clan", value: "Create missing starter roles and channels. Requires Manage Server.", inline: false }
      )
      .setFooter({ text: "REP HJM. STAY LOYAL." });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === "setup-clan") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You need Manage Server to run this command.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const report = { roles: [], categories: [], channels: [], skipped: [] };

    const roleNames = [
      "HJM Founder", "HJM Co-Founder", "HJM Head", "HJM Manager",
      "HJM Captain", "HJM Recruiter", "HJM Main Roster", "HJM Academy",
      "HJM Member", "HJM Trial", "Verified"
    ];

    for (const name of roleNames) {
      const existing = guild.roles.cache.find(role => role.name === name);
      if (existing) { report.skipped.push(`Role already exists: ${name}`); continue; }
      try {
        await guild.roles.create({
          name,
          reason: "HJM Clan Bot starter setup",
          permissions: []
        });
        report.roles.push(name);
      } catch (error) {
        report.skipped.push(`Could not create role ${name}: ${error.message}`);
      }
    }

    const layout = {
      "INFORMATION": ["welcome", "rules", "announcements"],
      "HJM CLAN": ["clan-chat", "clan-roster", "recruitment"],
      "SUPPORT": ["open-a-ticket", "member-help"]
    };

    for (const [categoryName, channelNames] of Object.entries(layout)) {
      let category = guild.channels.cache.find(
        channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName
      );
      if (!category) {
        try {
          category = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
            reason: "HJM Clan Bot starter setup"
          });
          report.categories.push(categoryName);
        } catch (error) {
          report.skipped.push(`Could not create category ${categoryName}: ${error.message}`);
          continue;
        }
      } else {
        report.skipped.push(`Category already exists: ${categoryName}`);
      }

      for (const channelName of channelNames) {
        const exists = guild.channels.cache.find(
          channel => channel.type === ChannelType.GuildText &&
            channel.name === channelName && channel.parentId === category.id
        );
        if (exists) { report.skipped.push(`Channel already exists: ${channelName}`); continue; }
        try {
          await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            reason: "HJM Clan Bot starter setup"
          });
          report.channels.push(channelName);
        } catch (error) {
          report.skipped.push(`Could not create channel ${channelName}: ${error.message}`);
        }
      }
    }

    const summary = [
      "**HJM starter setup finished.**",
      `Roles created: ${report.roles.length}`,
      `Categories created: ${report.categories.length}`,
      `Channels created: ${report.channels.length}`,
      `Already existing / skipped: ${report.skipped.length}`,
      "",
      "No existing roles or channels were deleted. New roles have no permissions by default.",
      "Review channel permissions and role hierarchy manually before opening the server."
    ].join("\n");

    return interaction.editReply({ content: summary });
  }
});

client.login(token);
