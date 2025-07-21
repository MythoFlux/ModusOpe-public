# Teacher Calendar & Project Management App

A comprehensive calendar and project management application designed for teachers, built with React, TypeScript, and Tailwind CSS.

## Features

- **Calendar Management**: Month, week, and day views with event scheduling
- **Project Management**: Create and manage courses, research projects, and administrative tasks
- **Task Tracking**: Add tasks to projects with priorities and due dates
- **Schedule Templates**: Create recurring class schedules
- **Google Drive Integration**: Attach files directly from Google Drive
- **File Management**: Upload and organize files for events and projects

## Google Drive Integration Setup

To enable Google Drive integration, you need to set up Google Cloud credentials:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click on it and press "Enable"

### 2. Create Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
   - Copy the API key for later use
3. Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add your domain to "Authorized JavaScript origins":
     - For development: `http://localhost:5173`
     - For production: your actual domain (e.g., `https://yourdomain.com`)
   - **IMPORTANT**: Add your domain to "Authorized redirect URIs":
     - For development: `http://localhost:5173`
     - For production: your actual domain (e.g., `https://yourdomain.com`)
   - Copy the Client ID for later use

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Replace the placeholder values with your actual credentials:
   ```
   VITE_GOOGLE_API_KEY=your_actual_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
   ```

### 4. Important Notes

- **Never commit your `.env` file** to version control
- The app will work in demo mode without real credentials
- For production deployment, set environment variables in your hosting platform
- **Critical**: Make sure to add your domain to BOTH "Authorized JavaScript origins" AND "Authorized redirect URIs" in the OAuth 2.0 Client ID settings
- The redirect URI must exactly match your application's origin (e.g., `http://localhost:5173` for development)

### 5. Demo Mode

If you don't set up Google credentials, the app will automatically run in demo mode with sample files. This is perfect for testing the interface without setting up the full integration.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Calendar**: Navigate between different views and create events
2. **Projects**: Manage courses and other projects with associated tasks
3. **Google Drive**: 
   - With credentials: Sign in to your Google account to browse and attach files
   - Without credentials: Use demo mode with sample files
4. **Schedule Templates**: Create recurring class schedules for automatic event generation

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Google Drive API
- Lucide React (icons)

## Security Considerations

- Environment variables are used for API keys
- OAuth 2.0 for secure Google authentication
- Files are linked, not stored locally
- Demo mode available for development/testing