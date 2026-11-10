require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands/definitions");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in environment.");
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
(async () => {
  try {
    console.log("Registering HJM Clan Bot slash commands...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Command registration failed:", error);
    process.exitCode = 1;
  }
})();
