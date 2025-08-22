# Docker Setup Guide for iBanking Tuition Payment System

## Prerequisites

Before starting, make sure you have installed:

- **Docker Desktop** (includes Docker and Docker Compose)
  - [Download for Windows](https://www.docker.com/products/docker-desktop/)
  - [Download for Mac](https://www.docker.com/products/docker-desktop/)
  - [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)
- **Git** for cloning the repository
- **Postman** or similar API testing tool (optional but recommended)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mqcuong1603/SOA-midterm-ibanking_payment_system.git
cd SOA-midterm-ibanking_payment_system
```

### 2. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file if needed (default values should work for local development).

### 3. Start Docker Services

```bash
# Start all services
docker-compose up -d

# Or use the script (Linux/Mac)
chmod +x docker-scripts.sh
./docker-scripts.sh
```

### 4. Verify Services Are Running

Check if all containers are running:

```bash
docker-compose ps
```

You should see:

- `ibanking-mysql` - MySQL database (port 3306)
- `ibanking-redis` - Redis cache (port 6379)
- `ibanking-api` - Node.js API (port 3000)
- `ibanking-adminer` - Database GUI (port 8080)

### 5. Access the Services

- **API**: http://localhost:3000
- **Adminer (Database GUI)**: http://localhost:8080
  - Server: `mysql`
  - Username: `ibanking_user`
  - Password: `ibanking_pass`
  - Database: `ibanking_db`

## Testing the API

### Test Credentials

The database is pre-populated with test data:

**Test Users:**

- Username: `johndoe`, Password: `password123`
- Username: `janedoe`, Password: `password123`
- Username: `testuser`, Password: `password123`

**Test Students:**

- `51900001` - Nguyen Van A (15,000,000 VND - unpaid)
- `51900002` - Tran Thi B (12,000,000 VND - unpaid)
- `51900003` - Le Van C (18,000,000 VND - unpaid)

### Using Postman

1. Import the Postman collection: `iBanking-API-Collection.postman_collection.json`
2. Set the environment variable `baseUrl` to `http://localhost:3000/api`
3. Follow the test flow:
   - Login → Get Profile → Get Student Info → Initiate Payment → Send OTP → Verify OTP → Confirm Payment

### Manual API Testing

#### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"password123"}'
```

Save the token from the response.

#### 2. Get User Profile

```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 3. Get Student Information

```bash
curl -X GET http://localhost:3000/api/student/51900001 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 4. Initiate Payment

```bash
curl -X POST http://localhost:3000/api/payment/initiate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"51900001","amount":15000000}'
```

## Docker Commands

### Basic Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f mysql

# Restart services
docker-compose restart

# Rebuild containers
docker-compose build --no-cache
```

### Database Management

```bash
# Access MySQL CLI
docker exec -it ibanking-mysql mysql -u ibanking_user -pibanking_pass ibanking_db

# Access Redis CLI
docker exec -it ibanking-redis redis-cli

# Reset database (WARNING: This will delete all data!)
docker-compose down -v
docker-compose up -d

# Backup database
docker exec ibanking-mysql mysqldump -u ibanking_user -pibanking_pass ibanking_db > backup.sql

# Restore database
docker exec -i ibanking-mysql mysql -u ibanking_user -pibanking_pass ibanking_db < backup.sql
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Port Already in Use

**Error:** `bind: address already in use`

**Solution:**

```bash
# Check which process is using the port
lsof -i :3000  # For Mac/Linux
netstat -ano | findstr :3000  # For Windows

# Change the port in docker-compose.yml if needed
# Example: Change "3000:3000" to "3001:3000"
```

#### 2. MySQL Connection Error

**Error:** `Can't connect to MySQL server`

**Solution:**

```bash
# Wait for MySQL to be fully ready
docker-compose logs mysql

# Check if MySQL is healthy
docker-compose ps

# Restart MySQL
docker-compose restart mysql
```

#### 3. Node Modules Issues

**Error:** `Module not found`

**Solution:**

```bash
# Rebuild the API container
docker-compose build --no-cache api
docker-compose up -d
```

#### 4. Permission Errors

**Error:** `Permission denied`

**Solution:**

```bash
# For Linux/Mac users
chmod -R 755 .
chmod +x docker-scripts.sh
```

#### 5. Docker Disk Space

**Error:** `No space left on device`

**Solution:**

```bash
# Clean up Docker system
docker system prune -a --volumes
```

## Email Configuration

### Development (Mailtrap)

1. Sign up for free at [Mailtrap.io](https://mailtrap.io)
2. Get your credentials from the inbox settings
3. Update `.env` file:

```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASSWORD=your_mailtrap_password
```

### Production (Gmail Example)

1. Enable 2-factor authentication in Gmail
2. Generate an app-specific password
3. Update `.env` file:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

## Development Workflow

### Making Code Changes

1. The API container uses volume mounting, so code changes are reflected immediately
2. For package.json changes:

```bash
docker-compose exec api npm install
docker-compose restart api
```

### Adding New Dependencies

```bash
# Add a new package
docker-compose exec api npm install package-name

# Save to package.json
docker-compose exec api npm install --save package-name
```

### Database Migrations

Create new migration files in `database/migrations/` and run:

```bash
docker exec -i ibanking-mysql mysql -u ibanking_user -pibanking_pass ibanking_db < database/migrations/new_migration.sql
```

## Production Deployment

### Building for Production

1. Use the production Dockerfile:

```bash
docker build -f Dockerfile -t ibanking-api:prod .
```

2. Use environment-specific configurations:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. Security considerations:

- Use strong passwords
- Enable SSL/TLS
- Use secrets management
- Implement rate limiting
- Add monitoring and logging

## Monitoring

### View Real-time Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f mysql
```

### Check Container Stats

```bash
docker stats
```

### Health Checks

```bash
# Check API health
curl http://localhost:3000/health

# Check MySQL
docker exec ibanking-mysql mysqladmin ping -h localhost

# Check Redis
docker exec ibanking-redis redis-cli ping
```

## Clean Up

### Stop and Remove Everything

```bash
# Stop containers and remove volumes
docker-compose down -v

# Remove all Docker artifacts
docker system prune -a --volumes
```

## API Documentation

### Available Endpoints

| Method | Endpoint                    | Description         | Auth Required |
| ------ | --------------------------- | ------------------- | ------------- |
| POST   | `/api/auth/login`           | User login          | No            |
| GET    | `/api/user/profile`         | Get user profile    | Yes           |
| GET    | `/api/student/:studentId`   | Get student info    | Yes           |
| POST   | `/api/payment/initiate`     | Start payment       | Yes           |
| POST   | `/api/payment/send-otp`     | Send OTP            | Yes           |
| POST   | `/api/payment/verify-otp`   | Verify OTP          | Yes           |
| POST   | `/api/payment/confirm`      | Confirm payment     | Yes           |
| GET    | `/api/transactions/history` | Transaction history | Yes           |

### Payment Flow

1. **Login** → Get authentication token
2. **Get Student Info** → Verify student exists and tuition amount
3. **Initiate Payment** → Create pending transaction
4. **Send OTP** → Email OTP to user
5. **Verify OTP** → Validate OTP code
6. **Confirm Payment** → Process payment and update balances

## Support

For issues or questions:

1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Check the database: Access Adminer at http://localhost:8080
4. Review environment variables in `.env`

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MySQL Docker Hub](https://hub.docker.com/_/mysql)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
