# HJM Clan Bot

Starter Discord bot built with Node.js and Discord.js v14.

## Included commands
- `/ping` — confirms the bot is online.
- `/help` — shows available commands.
- `/setup-clan` — creates missing starter roles, categories and text channels. It does not delete existing items. New roles have no permissions by default.

## Requirements
- Node.js 20+
- A Discord application and bot token
- The bot invited to your existing HJM server
- Bot role positioned above roles it must manage

## Run locally
1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
4. Run `npm install`.
5. Run `npm run deploy`.
6. Run `npm start`.

Never share your bot token or commit `.env` to GitHub.

## Railway
1. Upload this project to a private GitHub repository.
2. Create a Railway project and deploy from that repository.
3. Add `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` in Railway Variables.
4. Railway runs `npm start` using the package start script.
5. Run `npm run deploy` once from a local terminal after setting the same environment values, or use Railway's one-time command feature if available.

## Required bot permissions
For this starter: View Channels, Manage Channels, Manage Roles, Send Messages, Embed Links, Read Message History. Do not grant Administrator. The bot role must be above the roles it needs to create/manage, but below protected owner roles.

## Important
This is the first working foundation, not the complete ticket/recruitment/moderation suite yet. Add those modules in later stages. Review every permission overwrite before using `/setup-clan` in a live server.
