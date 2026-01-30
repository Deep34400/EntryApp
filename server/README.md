# Backend is external

This app calls **your own backend API**. No server code runs here.

- Set **EXPO_PUBLIC_API_URL** in `.env` to your backend base URL.
- Implement the endpoints listed in **client/lib/api-endpoints.ts** (POST create ticket, GET ticket details, POST close ticket).
