# Gebeya Boot - Telegram Shop & AI Order Assistant

A complete e-commerce platform for Ethiopian small shops, powered by Telegram bots and AI assistants. Shop owners can create their own Telegram stores, and customers can browse products, place orders, and get instant answers in Amharic or English.

## 🚀 Features

### For Shop Owners
- **Easy Onboarding**: Sign up with phone number (SMS verification)
- **Shop Management**: Create shop profile with hours, delivery areas, payment details
- **Product Management**: Add products with photos, prices, stock, and categories
- **Order Management**: View, confirm, reject, and track orders
- **AI Assistant**: Automated customer support with fallback to owner
- **Sales Analytics**: Track daily/weekly/monthly income and best-selling products
- **Multi-language**: Amharic and English support with Ethiopian calendar option
- **Subscription Plans**: Free, Basic, and Pro tiers with usage limits

### For Customers
- **Telegram Bot**: Browse and order entirely within Telegram (no app download needed)
- **Product Browsing**: View products with photos, prices, and options
- **Cart & Checkout**: Build cart and checkout with delivery/pickup options
- **Order Tracking**: Real-time order status updates
- **AI Q&A**: Get instant answers about products, prices, and availability
- **Payment Options**: Cash on delivery, direct bank transfer, or pickup payment

### For Platform Admin
- **Shop Approval**: Review and approve new shop registrations
- **Plan Management**: Create and manage subscription plans
- **Payment Review**: Verify subscription payments
- **Quality Monitoring**: Track AI performance and customer complaints
- **Audit Logs**: Complete activity tracking

## 📋 Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT with SMS verification
- **AI**: Gemini/OpenAI API integration
- **File Storage**: Local or AWS S3
- **SMS**: AfroMessage (Ethiopian provider)

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: React Context
- **Charts**: Custom components

### Infrastructure
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2
- **SSL**: Let's Encrypt
- **Container**: Docker (for local development)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 15.x or higher
- Redis 7.x or higher
- npm or yarn

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd gebeya-boot
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/gebeya_boot?schema=public
REDIS_HOST=localhost
REDIS_PORT=6381
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username
AI_PROVIDER=mock
SMS_PROVIDER=mock
```

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_BOT_USERNAME=your-bot-username
```

### 4. Start Database Services

Using Docker Compose:

```bash
cd ..
docker-compose up -d
```

This starts PostgreSQL and Redis containers.

### 5. Run Database Migrations

```bash
cd backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

The seed script creates:
- Subscription plans (FREE, BASIC, PRO)
- Admin account (admin@gebeya-boot.et)
- Sample pilot shops with products
- Sample orders for testing

### 6. Start Development Servers

**Backend** (port 3000):
```bash
cd backend
npm run start:dev
```

**Frontend** (port 3001):
```bash
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api/docs (Swagger)
- **Admin Panel**: http://localhost:3001/admin

## 📱 Telegram Bot Setup

For production deployment, follow the detailed guide in [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md).

Quick setup:
1. Create bot via @BotFather on Telegram
2. Get bot token
3. Update `TELEGRAM_BOT_TOKEN` in `.env`
4. Restart backend server
5. Test by sending `/start` to your bot

## 🚢 Production Deployment

For production deployment, follow the comprehensive guide in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

Key steps:
1. Set up production server (Ubuntu recommended)
2. Configure PostgreSQL and Redis
3. Obtain SSL certificate (Let's Encrypt)
4. Configure Nginx reverse proxy
5. Set up PM2 for process management
6. Configure environment variables
7. Set up automated backups
8. Enable monitoring and logging

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm run test
npm run test:e2e
npm run test:cov
```

### Test Telegram Bot Locally

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

### Test with Seed Data

The seed script creates test data:
- **Admin**: admin@gebeya-boot.et / AdminGebeya2026!Secure
- **Shop Owner 1**: +251911111111 (phone)
- **Shop Owner 2**: +251922222222 (phone)
- **Sample Products**: Shoes, bags, etc.
- **Sample Orders**: Delivered orders for analytics

## 📊 API Documentation

Swagger UI is available at `/api/docs` when the backend is running.

Key endpoints:
- `POST /api/auth/owner/send-code` - Send SMS verification
- `POST /api/auth/owner/verify-code` - Verify and login
- `POST /api/shops` - Create shop
- `GET /api/shops/:id` - Get shop details
- `POST /api/shops/:id/products` - Add product
- `GET /api/shops/:id/products` - List products
- `POST /api/orders` - Create order
- `GET /api/shops/:id/orders` - List shop orders
- `POST /api/telegram/webhook` - Telegram bot webhook
- `POST /api/telegram/simulate` - Test bot locally

## 🎨 User Interface

### Shop Owner Dashboard
- **Home**: Overview with metrics and quick actions
- **Orders**: Order list with status management
- **Products**: Product CRUD with photo upload
- **Chats**: AI conversation management
- **Sales**: Analytics and reports
- **Profile**: Shop settings and QR code
- **Subscription**: Plan management and payment

### Admin Panel
- **Home**: Platform overview and counters
- **Shops**: Shop list with approval workflow
- **Plans**: Subscription plan management
- **Payments**: Payment review and approval
- **Quality**: AI performance monitoring
- **Complaints**: Customer complaint handling

### Telegram Bot (Customer)
- Language selection (Amharic/English)
- Product browsing by category
- Cart and checkout
- Order status tracking
- AI-powered Q&A
- Shop information

## 🔐 Security

- JWT-based authentication
- Role-based access control (OWNER, ADMIN, STAFF)
- SMS verification for phone numbers
- Telegram webhook secret validation
- SQL injection prevention (Prisma)
- XSS protection (Next.js)
- CSRF protection (Next.js)
- Rate limiting on API endpoints
- Input validation with class-validator

## 📈 Performance

- Redis caching for frequently accessed data
- Database indexing on critical fields
- Optimized queries with Prisma
- Static asset caching with Nginx
- CDN support for file uploads
- Connection pooling for database

## 🌍 Localization

Currently supported:
- **Amharic** (አማርኛ) - Full UI and bot support
- **English** - Full UI and bot support

Planned:
- **Afaan Oromo** - Phase 2

## 📞 Support

For issues or questions:
- Check the [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- Review the [Telegram Bot Setup](./TELEGRAM_BOT_SETUP.md)
- Check the API documentation at `/api/docs`
- Review backend logs with `pm2 logs`
- Open an issue on GitHub

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a commercial project. For contribution opportunities, please contact the development team.

## 📄 Version

Current version: 1.0.0
Last updated: October 2026

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Shop owner onboarding
- ✅ Product management
- ✅ Order management
- ✅ Telegram bot integration
- ✅ AI assistant (basic)
- ✅ Subscription plans
- ✅ Admin panel

### Phase 2 (Planned)
- Bulk product import (spreadsheet)
- Order search and export
- Afaan Oromo language
- Advanced AI features
- Staff accounts
- Reseller program

### Phase 3 (Future)
- Mobile apps (iOS/Android)
- Marketplace across shops
- Payment gateway integration
- Custom branding
- Analytics dashboard
- WhatsApp integration

---

**Built with ❤️ for Ethiopian small businesses**
