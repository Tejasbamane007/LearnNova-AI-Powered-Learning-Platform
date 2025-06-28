# Learnova – AI-Powered Learning Platform

**Learnova** is a dynamic and intelligent learning management platform that leverages AI and modern web technologies to enhance the educational experience. Built with **React**, **Express.js**, **MongoDB**, **TypeScript**, and **Gemini (Google Generative AI)**, Learnova empowers students with personalized learning tools and insights.

---

## Features

- Topic-wise Notes Generation  
- Auto-generated Quizzes  
- AI-powered Study Plan Generator  
- Dashboard with Quiz Scores and Course Progress  
- Google OAuth 2.0 Authentication  
- Gemini Chatbot Integration

---

## Screenshots

### Landing Page  
![image](https://github.com/user-attachments/assets/d5869f42-04cf-4ed3-b48b-5b7eb3fcc3ea)

### Course Setup  
![image](https://github.com/user-attachments/assets/8f8b0b6f-1a67-47f1-b884-d646a85b72b7)

### Select what to generate
![image](https://github.com/user-attachments/assets/2bc13818-c613-4a17-9eec-0e5450fd85d7)

### Notes Page and Chat bot
![image](https://github.com/user-attachments/assets/37b52b42-0354-4d47-bb6c-430f5ec074a2)
![image](https://github.com/user-attachments/assets/c010d67b-377e-4631-bca3-de327478e4e7)

### My Courses
![image](https://github.com/user-attachments/assets/b571e7ab-5f02-4b55-80a2-d48bf12f81b3)

### Dashboard Charts  
![image](https://github.com/user-attachments/assets/37e7ad57-f6a6-464a-9a8b-f15a5f586dc4)

### Profile 
![image](https://github.com/user-attachments/assets/6f85e294-8fa7-4380-abca-9d128690ca6a)

---

## Tech Stack

| Frontend         | Backend     | AI Integration | Database      |
|------------------|-------------|----------------|---------------|
| React + TypeScript | Express.js | Gemini API     | MongoDB Atlas |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Tejasbamane007/LearNova-AI-powered-learning-managment-system.git
cd LearnNova
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder with the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_custom_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
GEMINI_API_KEY=your_gemini_api_key
```

---

### 3. Start Backend Server

```bash
npx nodemon server.js
```

---

### 4. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

---

## Background Video

A background video is used on the landing page. Please download it and place it at:

**Path:** `frontend/public/bg.mp4`  
**Download Link:** [Click here to download bg.mp4](https://drive.google.com/file/d/YOUR_VIDEO_FILE_ID/view?usp=sharing)

---

## Configuration Details

### MongoDB URI

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster
3. Click **Connect → Connect your application**
4. Copy the connection string and set it in `.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
```

---

### JWT Secret

Generate a strong secret key using PowerShell:

```powershell
[guid]::NewGuid().ToString("N")
```

Or use a tool like [randomkeygen.com](https://randomkeygen.com)

---

### Google OAuth 2.0 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to **APIs & Services → OAuth consent screen**
4. Fill out required info
5. Go to **Credentials → Create Credentials → OAuth Client ID**
6. Choose **Web Application**
7. Add this to **Authorized redirect URIs**:

```
http://localhost:5000/auth/google/callback
```

8. Add these to your `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

### Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create and copy your Gemini API key
3. Add it to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## Security Best Practices

- `.env` is listed in `.gitignore` and should never be committed.
- If secrets are accidentally committed:
  - Regenerate keys immediately
  - Use tools like `git filter-repo` to scrub them from history

---

## License

MIT License © 2025 [Tejas Bamane](https://github.com/Tejasbamane007)
