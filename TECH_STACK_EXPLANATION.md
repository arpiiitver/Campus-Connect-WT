# Campus Connect - Tech Stack Explanation

This document explains the technologies used in the **Campus Connect** project and their roles, providing a clear, high-level understanding to help you ace your interview.

## 1. Core Architecture: The MERN Stack
The project is built on the **MERN** stack, a popular and powerful JavaScript-based framework for building full-stack web applications.
*   **MongoDB:** The database. It is a NoSQL database, meaning it stores data in flexible, JSON-like documents rather than rigid tables with rows and columns. This flexibility is great for fast-paced development.
*   **Express.js:** The backend web framework running on top of Node.js. It simplifies the process of creating API endpoints (like `/api/auth/login`) and routing HTTP requests to the correct functions.
*   **React (v19):** The frontend library used for building the user interface. It allows you to create reusable UI components (like buttons, navbars, and listing cards) and manages the state of the application efficiently without needing to reload the page.
*   **Node.js:** The JavaScript runtime environment that executes the backend code outside of a web browser, allowing JavaScript to be used for server-side scripting.

## 2. Frontend (Client-Side) Technologies
*   **Vite (v7):** The build tool and development server. It is significantly faster than older tools (like Create React App), providing instant server starts and lightning-fast updates when you change code during development.
*   **Tailwind CSS (v3.4):** A utility-first CSS framework. Instead of writing custom CSS in separate files, you use predefined classes directly in your React components to style elements rapidly (e.g., `text-center bg-blue-500`).
*   **Framer Motion (v12):** A powerful animation library for React. It is used for page transitions, micro-animations, and bringing the UI to life, which fits perfectly with the dynamic neobrutalist design of the app.
*   **Radix UI & Lucide React:** Radix provides accessible, unstyled UI components (like modals and dropdowns) that you then styled with Tailwind. Lucide provides the comprehensive, consistent icon set used across the application.
*   **Sonner:** A lightweight toast notification system used to give users immediate, non-intrusive feedback (like "Login successful" or "Listing created").

## 3. Backend (Server-Side) & Real-Time Technologies
*   **Mongoose (v8.2):** An Object Data Modeling (ODM) library for MongoDB and Node.js. It enforces schemas (defining what a User or Listing should look like) and provides a structured way to interact with the database.
*   **Socket.IO (v4.8):** Enables real-time, bi-directional communication between the client and the server using WebSockets. This is the technology behind the real-time chat and typing indicators, allowing messages to appear instantly on the screen without the user refreshing the page.
*   **JSON Web Tokens (JWT):** Used for stateless, secure authentication. When a user logs in, the server generates a JWT and sends it to the client. The client sends this token with every subsequent request to prove they are authorized, meaning the server doesn't have to remember active sessions in its memory.
*   **Bcryptjs:** A password-hashing function. It ensures that user passwords are securely hashed (with a generated salt) before being stored in the database, protecting user data even if the database is compromised.
*   **Node.js Crypto (AES-256-GCM):** Provides native cryptographic functionality. It is used to encrypt the chat messages before they are saved to the MongoDB database. AES-256-GCM ensures both confidentiality (the message is hidden) and authenticity (the message hasn't been tampered with).
