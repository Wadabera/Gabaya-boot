# Gebeya Boot - Quick Start Guide

Get your Telegram AI shop up and running in 10 minutes!

## 🎯 For Shop Owners

### Step 1: Sign Up (2 minutes)

1. Go to [gebeya-boot.et](https://gebeya-boot.et) (or your local http://localhost:3001)
2. Click "Start as Shop Owner"
3. Enter your phone number (Ethiopian format: +2519... or 09...)
4. Enter the SMS verification code (in development, use the code shown on screen)
5. Create your shop profile:
   - Shop name (e.g., "Bole Fashion Store")
   - Area/location (e.g., "Bole Medhanialem")
   - Opening hours
   - Delivery areas
   - Bank/payment details

### Step 2: Add Your First Product (3 minutes)

1. Click "Add First Product"
2. Enter product details:
   - Name (e.g., "Leather Shoes")
   - Price in ETB
   - Stock quantity
   - Category
   - Upload a photo
3. Click "Add Product"

### Step 3: Get Your Bot Link (1 minute)

1. Copy your unique Telegram bot link
2. Download the QR code
3. Share the link on:
   - Facebook
   - TikTok (in bio)
   - WhatsApp groups
   - Print and display in your physical shop

### Step 4: Start Receiving Orders! (4 minutes)

1. Customers click your link to browse products
2. They place orders through Telegram
3. You get instant notifications
4. Confirm/reject orders from your dashboard
5. The AI answers common questions automatically

## 🎯 For Customers

### How to Order from a Shop

1. **Find a Shop**: Click the shop's Telegram link or scan their QR code
2. **Choose Language**: Select Amharic (አማርኛ) or English
3. **Browse Products**: Tap "See Products" to browse categories
4. **Add to Cart**: Select products, choose size/quantity, tap "Add to Order"
5. **Checkout**: Tap "Checkout" and enter:
   - Your name
   - Phone number
   - Delivery area
6. **Choose Payment**: Select:
   - Cash on delivery
   - Pay directly to shop (bank/mobile money)
   - Pay at pickup
7. **Confirm**: Review your order and tap "Confirm"
8. **Track**: Use "My Orders" to track your order status

### How to Ask Questions

1. Tap "Ask a Question" in the bot menu
2. Type your question (e.g., "What's the price of the leather shoes?")
3. The AI answers instantly using the shop's data
4. If the AI is unsure, the shop owner will reply directly

## 🎯 For Platform Admins

### First-Time Setup

1. **Login**:
   - Email: admin@gebeya-boot.et
   - Password: AdminGebeya2026!Secure
   - Enter 2FA code: 123456 (development)

2. **Review Shops**:
   - Go to "Shops" tab
   - Review pending registrations
   - Approve or reject with reason

3. **Manage Plans**:
   - Go to "Plans" tab
   - Review and adjust pricing
   - Set product/order/AI limits

4. **Monitor Quality**:
   - Check "Quality" tab for AI performance
   - Review "Complaints" tab
   - Check audit logs

## 🔧 Local Development Setup

### For Developers

```bash
# 1. Clone and install
git clone <repo-url>
cd gebeya-boot
cd backend && npm install
cd ../frontend && npm install

# 2. Start database
cd ..
docker-compose up -d

# 3. Run migrations
cd backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

# 4. Start servers
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Test Accounts

After seeding, you can use these test accounts:

**Admin**:
- Email: admin@gebeya-boot.et
- Password: AdminGebeya2026!Secure
- 2FA Code: 123456

**Shop Owner 1**:
- Phone: +251911111111
- SMS Code: 123456 (development)
- Shop: Bole Elegant Leather

**Shop Owner 2**:
- Phone: +251922222222
- SMS Code: 123456 (development)
- Shop: Piassa Spices & Coffee

## 📱 Testing the Telegram Bot

### Without a Real Bot (Development)

Use the simulation endpoint:

```bash
curl -X POST http://localhost:3000/api/telegram/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 123456789,
    "messageText": "/start",
    "userName": "Test User"
  }'
```

### With a Real Bot

1. Create bot via @BotFather (see [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md))
2. Update `TELEGRAM_BOT_TOKEN` in backend/.env
3. Restart backend
4. Search for your bot on Telegram
5. Send `/start` or click your shop link

## 🎨 Customization

### Change Brand Colors

Edit `frontend/src/app/globals.css`:

```css
@layer base {
  :root {
    --brand-50: #f0f9ff;
    --brand-500: #0ea5e9;
    --brand-600: #0284c7;
    --brand-700: #0369a1;
  }
}
```

### Add New Languages

1. Add translations in `frontend/src/lib/i18n.ts`
2. Update language selector in components
3. Update backend notification service

### Customize Plans

Edit `backend/prisma/seed.ts` or use admin panel to:
- Change plan names
- Adjust pricing
- Set limits (products, orders, AI answers)

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `docker-compose ps`
- Check .env variables are set correctly
- Check port 3000 is not in use

### Frontend won't start
- Check backend is running on port 3000
- Check NEXT_PUBLIC_API_URL is correct
- Clear .next folder: `rm -rf .next`

### Database errors
- Run migrations: `npm run prisma:push`
- Check DATABASE_URL in .env
- Reset database: `npm run prisma:push --force-reset`

### Telegram bot not responding
- Check TELEGRAM_BOT_TOKEN is correct
- Check backend logs for errors
- If using webhook, verify URL is HTTPS
- Try polling mode: `TELEGRAM_POLLING=true`

## 📚 Next Steps

1. **Read the full docs**:
   - [README.md](./README.md) - Complete overview
   - [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
   - [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md) - Bot configuration

2. **Test all features**:
   - Shop owner onboarding
   - Product management
   - Order placement
   - AI Q&A
   - Admin approval workflow

3. **Prepare for production**:
   - Set up domain and SSL
   - Configure real SMS provider
   - Set up real AI API (Gemini/OpenAI)
   - Configure file storage (S3)
   - Set up monitoring and backups

## 💡 Tips

- **For Shop Owners**: Start with 5-10 popular products to test the system
- **For Customers**: Bookmark your favorite shops for quick access
- **For Admins**: Approve shops quickly to reduce wait time
- **For Developers**: Use the seed data for testing before real users

## 🆘 Need Help?

- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review the API docs at `/api/docs`
- Check backend logs: `pm2 logs`
- Contact support at support@gebeya-boot.et

---

**Happy Selling! 🛍️**
