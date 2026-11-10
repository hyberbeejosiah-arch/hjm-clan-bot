const { EmbedBuilder } = require("discord.js");

const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || "1569742200747859968";

async function sendWelcome(member) {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID)
    ?? await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased()) return;

  const count = member.guild.memberCount;
  const embed = new EmbedBuilder()
    .setAuthor({ name: "HJM CLAN  •  WELCOME" })
    .setTitle(`👋  Welcome to ${member.guild.name}, ${member.displayName}!`)
    .setDescription(
      `${member}, we're glad you're here.\n\n` +
      "```fix\nRead the rules, say hi, and make yourself at home.\n```\n" +
      "> 📜  Check the information channels first\n" +
      "> 💬  Jump into the community chat\n" +
      "> 🎫  Need help? Open a ticket from the support panel"
    )
    .addFields(
      { name: "Member", value: `#${count}`, inline: true },
      { name: "Account created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setColor(0x7B2CBF)
    .setFooter({ text: `HJM Clan  •  You are member #${count}` })
    .setTimestamp();

  await channel.send({
    content: `Welcome ${member}!`,
    embeds: [embed],
    allowedMentions: { users: [member.id] },
  });
}

module.exports = { sendWelcome };
