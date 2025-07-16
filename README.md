# 16score VMix Server

A Node.js Express backend with MongoDB for user authentication.

## Features

- **RESTful API** with Express.js
- **MongoDB** database with Mongoose ODM
- **User Authentication** - Signup, login, and delete user
- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Security** - Helmet, CORS, rate limiting
- **Logging** - Morgan HTTP request logger
- **Environment Configuration** - Environment variables support

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 16score-vmix-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the config file
   cp config.env .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **MongoDB Setup**
   - Make sure MongoDB is running on your system
   - The default connection string is: `mongodb://localhost:27017/LiveScores`
   - You can change this in the `.env` file

5. **Start the server**
   ```bash
   # Development mode (with nodemon)
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://dhruvpatel:CxX7cPZEool9ByMJ@vmix.fuvoxyh.mongodb.net/LiveScores?retryWrites=true&w=majority&appName=vmix

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Documentation

### Swagger UI
Access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Interactive API documentation
- Request/response examples
- Schema definitions
- Try-it-out functionality
- Authentication support

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Health Check
- `GET /health` - Server health status

### Authentication API
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires JWT token)
- `DELETE /api/auth/delete` - Delete user account (requires JWT token)

### LiveScore API (No Authentication Required)
- `GET /api/livescore/:matchId?type=points_table` - Get points table data
- `GET /api/livescore/:matchId?type=alive_status` - Get team alive status
- `GET /api/livescore/:matchId/full` - Get complete match data

### API Links Management (Requires Authentication)
- `POST /api/apilinks` - Create new random API link
- `GET /api/apilinks` - Get user's API links
- `DELETE /api/apilinks/:linkId` - Delete API link
- `PATCH /api/apilinks/:linkId/update` - Update matchId and type
- `PATCH /api/apilinks/:linkId/toggle` - Toggle enable/disable
- `PATCH /api/apilinks/:linkId/status` - Set explicit enable/disable status

### Public API Links (No Authentication Required)
- `GET /api/public/:linkId` - Access data through random link

## Database Models

### User Model
```javascript
{
  firstName: String (required, max 50 chars),
  lastName: String (required, max 50 chars),
  email: String (required, unique, email format),
  password: String (required, min 6 chars, hashed),
  timestamps: true
}
```

## Example API Usage

### User Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get User Profile (requires JWT token)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete User Account (requires JWT token)
```bash
curl -X DELETE http://localhost:3000/api/auth/delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Points Table Data
```bash
curl "http://localhost:3000/api/livescore/cb5ffa72-03d2-4d9a-9549-d65ad20a1797?type=points_table"
```

### Get Team Alive Status
```bash
curl "http://localhost:3000/api/livescore/cb5ffa72-03d2-4d9a-9549-d65ad20a1797?type=alive_status"
```

### Get Full Match Data
```bash
curl "http://localhost:3000/api/livescore/cb5ffa72-03d2-4d9a-9549-d65ad20a1797/full"
```

### Create API Link (requires JWT token)
```bash
curl -X POST http://localhost:3000/api/apilinks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "cb5ffa72-03d2-4d9a-9549-d65ad20a1797",
    "type": "full"
  }'
```

### Get User's API Links (requires JWT token)
```bash
curl -X GET http://localhost:3000/api/apilinks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Access Public API Link (no authentication)
```bash
curl "http://localhost:3000/api/public/RANDOM_LINK_ID_HERE"
```

### Update API Link (requires JWT token)
```bash
curl -X PATCH http://localhost:3000/api/apilinks/LINK_ID/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "new-match-id-here",
    "type": "alive_status"
  }'
```

### Enable/Disable API Link (requires JWT token)
```bash
# Toggle status
curl -X PATCH http://localhost:3000/api/apilinks/LINK_ID/toggle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Set explicit status
curl -X PATCH http://localhost:3000/api/apilinks/LINK_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

## Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - Mongoose schema validation
- **Error Handling** - Comprehensive error responses

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (to be implemented)

### Project Structure
```
16score-vmix-server/
├── models/          # MongoDB models
│   ├── User.js
│   └── ApiLink.js
├── routes/          # API routes
│   ├── auth.js
│   ├── livescore.js
│   ├── apilinks.js
│   └── public.js
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
├── config.env       # Environment variables template
└── README.md        # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support and questions, please open an issue on the repository. 