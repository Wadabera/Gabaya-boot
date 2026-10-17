# Telegram Bot Setup Guide for Gebeya Boot

This guide will help you set up a real Telegram bot for production use with the Gebeya Boot platform.

## Prerequisites

- A Telegram account
- Backend server running (http://localhost:3000 or your production URL)
- Domain name with HTTPS (required for production webhooks)

## Step 1: Create Your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat with BotFather
3. Send the command `/newbot`
4. Follow the prompts:
   - **Bot name**: Gebeya Boot Shop (or your preferred name)
   - **Bot username**: Must end in `bot` (e.g., `gebeyashop_bot`, `myshop_bot`)
5. BotFather will provide you with a **Bot Token** (looks like: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)
6. **Save this token securely** - you'll need it for your environment variables

## Step 2: Configure Bot Settings (Optional but Recommended)

### Set Bot Description
Send to BotFather:
```
/setdescription
```
Then select your bot and enter:
```
Browse products, place orders, and get instant answers from Ethiopian shops. Use: /start
```

### Set Bot Commands
Send to BotFather:
```
/setcommands
```
Then select your bot and paste:
```
start - Start shopping or open your shop
help - Get help and support
orders - View your orders
menu - Show main menu
```

### Set Privacy Mode (IMPORTANT)
Send to BotFather:
```
/setprivacy
```
Select your bot and choose **Disable** - This allows the bot to read all messages in groups (not needed for now, but good to know)

## Step 3: Update Environment Variables

### For Local Development

Edit `backend/.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username_without_@
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=random-secret-string-32-chars
TELEGRAM_POLLING=true
```

Example:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_BOT_USERNAME=gebeyashop_bot
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=gebeya-secret-key-2024-production
TELEGRAM_POLLING=true
```

### For Production (with Webhook)

Edit your production environment variables:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username_without_@
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=random-secret-string-32-chars
TELEGRAM_POLLING=false
```

**Important**: `TELEGRAM_WEBHOOK_URL` must be HTTPS and publicly accessible.

## Step 4: Restart Backend Server

After updating the environment variables, restart your backend:

```bash
# Stop the current server (Ctrl+C)
# Then restart
cd backend
npm run start:dev
```

## Step 5: Test Your Bot

### Method 1: Direct Test (Recommended for Development)

1. Open Telegram and search for your bot by username
2. Click **Start**
3. Send a message like: "hello" or "/start"
4. Check the backend logs - you should see incoming updates
5. The bot should respond with the main menu

### Method 2: Using API Simulation Endpoint

You can test the bot without a real Telegram account using the simulation endpoint:

```bash
curl -X POST http://localhost:3000/api/telegram/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 123456789,
    "messageText": "/start",
    "userName": "Test User"
  }'
```

## Step 6: Verify Webhook (Production Only)

If using webhooks in production, verify it's set correctly:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Step 7: Shop-Specific Deep Links

Each shop gets a unique deep link that customers can use to start shopping:

Format: `https://t.me/<BOT_USERNAME>?start=shop_<SHOP_ID>`

Example: `https://t.me/gebeyashop_bot?start=shop_abc123def456`

When a customer clicks this link:
1. Telegram opens a chat with your bot
2. The `/start` command is sent with `shop_<SHOP_ID>` parameter
3. The bot identifies which shop the customer wants to browse
4. The customer sees that shop's products in Amharic or English

## Troubleshooting

### Bot not responding
- Check backend logs for errors
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Ensure backend server is running
- If using webhook, verify the URL is HTTPS and accessible

### Webhook not working
- Your domain must have valid SSL certificate
- The webhook URL must be publicly accessible (not localhost)
- Check firewall settings allow Telegram IP addresses
- Use `getWebhookInfo` to verify webhook status

### Polling mode not working
- Set `TELEGRAM_POLLING=true` in .env
- Restart the backend server
- Check logs for polling activity

### Bot says "Bad Request"
- Verify the bot token format is correct
- Ensure you're using the right bot token for the right environment

## Security Best Practices

1. **Never commit bot tokens to Git** - always use environment variables
2. **Use strong webhook secrets** - random 32+ character strings
3. **Rotate tokens periodically** - especially if compromised
4. **Monitor bot usage** - set up rate limiting if needed
5. **Verify Telegram requests** - use the webhook secret header

## Advanced Configuration

### Set Bot Profile Picture
Send to BotFather:
```
/setuserpic
```
Then select your bot and upload an image (PNG/JPG, max 10MB)

### Set Bot Commands in Menu
The commands you set in Step 2 will appear as a menu button when users click the menu icon in Telegram.

### Enable Inline Mode (Future Feature)
Send to BotFather:
```
/setinline
```
This allows users to search your bot's products from any Telegram chat (planned for Phase 2).

## Production Deployment Checklist

- [ ] Bot created via @BotFather
- [ ] Bot token saved in production environment variables
- [ ] Webhook URL set to HTTPS domain
- [ ] Webhook secret configured
- [ ] Backend server deployed and accessible
- [ ] Bot description and commands set
- [ ] Bot profile picture uploaded
- [ ] Test shop deep links work correctly
- [ ] Error monitoring set up (e.g., Sentry)
- [ ] Rate limiting configured
- [ ] Backup strategy in place

## Support

If you encounter issues:
1. Check the backend logs: `backend/logs/` or console output
2. Verify all environment variables are set correctly
3. Test with the simulation endpoint first
4. Check Telegram's Bot API documentation: https://core.telegram.org/bots/api
5. Review the Gebeya Boot implementation in `backend/src/modules/telegram/`

## Next Steps

After setting up the bot:
1. Test the complete customer ordering flow
2. Verify owner notifications work
3. Test AI assistant responses
4. Add shop-specific QR codes to physical locations
5. Share bot links on social media (Facebook, TikTok)

---

**Note**: For local development, polling mode (`TELEGRAM_POLLING=true`) is sufficient. For production, webhooks are recommended for better performance and reliability.
