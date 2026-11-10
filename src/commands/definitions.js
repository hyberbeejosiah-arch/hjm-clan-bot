const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether HJM Clan Bot is online."),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show HJM Clan Bot commands."),
  new SlashCommandBuilder()
    .setName("setup-clan")
    .setDescription("Create the HJM clan roles, categories, channels, colors, and permission setup.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption(option =>
      option.setName("create-voice")
        .setDescription("Also create the clan voice channels.")
        .setRequired(false)
    )
].map(command => command.toJSON());

module.exports = { commands };