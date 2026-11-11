# HJM Clan Bot — advanced role and channel setup

## What `/setup-clan` does
- Creates/updates 15 HJM clan roles with colors and limited permissions.
- Creates the information, community, competitive, staff, and voice categories.
- Creates text channels and optional voice channels.
- Applies role-based channel access, including private staff channels.
- Does not delete existing channels or roles.
- Does not grant Administrator.

## Required Railway variables
- `DISCORD_TOKEN`
- `AI_API_KEY` — enables the ticket AI assistant (OpenAI-compatible); optional `AI_BASE_URL`, `AI_MODEL`, `AI_SYSTEM_PROMPT`. Requires the **Message Content Intent** in the Discord developer portal.
- `CLIENT_ID`
- `GUILD_ID`

Never share the bot token. If it is exposed, reset it in the Discord Developer Portal.

## Discord bot permissions
The bot needs **Manage Roles**, **Manage Channels**, and **View Channels**. It also needs to be placed above the HJM roles it creates in Server Settings → Roles. Do not grant Administrator.

## Update an existing Railway/GitHub project
Replace the matching files in your GitHub repository with the files in this ZIP. Keep your Railway variables unchanged.
After the GitHub commit deploys:
1. Railway Settings → Deploy → Pre-deploy Command: `npm run deploy`
2. Redeploy the service.
3. In Discord, run `/setup-clan`.
4. Check the created role colors, role order, and private staff channels.

## Notes
This setup applies permissions to the HJM categories/channels with these names. If you already have channels with those exact names, their permission overwrites and category placement will be updated. Other channels are left alone. Review the permissions before inviting everyone.
