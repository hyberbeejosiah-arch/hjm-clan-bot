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
    .setDescription("Create missing HJM clan starter roles and channels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(command => command.toJSON());

module.exports = commands;
