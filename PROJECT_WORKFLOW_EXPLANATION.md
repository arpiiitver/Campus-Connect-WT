# Campus Connect - System Workflow & Communication

This document explains the step-by-step workflow of the project, focusing on how the React frontend interacts with the Node.js/Express backend and the MongoDB database. It is designed to help you explain the data flow clearly during your interview.

## 1. Overall Communication Pattern
The application follows a standard **Client-Server architecture** communicating primarily via **RESTful APIs** over HTTP, supplemented by **WebSockets** for real-time features.
*   **Client (React Frontend):** Makes HTTP requests (GET, POST, PATCH, DELETE) to the backend API endpoints to fetch or send data.
*   **Server (Express/Node.js Backend):** Receives requests, processes business logic, interacts with the MongoDB database, and sends back JSON responses to the frontend.

## 2. Authentication Workflow (Signup & Login)
*   **User Action:** A user submits the login form on the React frontend.
*   **API Call:** React makes an HTTP POST request to `/api/auth/login` containing the email and password.
*   **Backend Processing:** 
    *   Express routes the request to the authentication controller.
    *   Mongoose queries the MongoDB "Users" collection to find the user by their email.
    *   The backend uses `bcryptjs` to compare the provided plaintext password against the stored hashed password.
*   **JWT Generation:** If successful, the server generates a JSON Web Token (JWT) signed with a secret key and sends it back to the client.
*   **State Update:** The React frontend receives the JWT, stores it locally (`localStorage`), and updates the application state to reflect that the user is logged in. 
*   **Subsequent Requests:** For any protected action (like creating a listing), React automatically attaches this JWT to the HTTP request headers (`Authorization: Bearer <token>`). The backend's authentication middleware verifies this token before allowing the action to proceed.

## 3. Data Flow: Creating & Fetching Listings
*   **Creating a Listing:**
    *   The user fills out the listing form and uploads an image (which React converts to a Base64 string).
    *   React sends an HTTP POST request to `/api/listings` with the listing data and the JWT in the header.
    *   The Express server's middleware verifies the JWT to ensure the user is authorized and extracts the user's ID.
    *   Mongoose validates the incoming data against the Listing schema and inserts a new document into the database, linking it to the user's ID as the `seller_id`.
    *   The server responds with the created listing data, and React displays a success notification to the user.
*   **Fetching Listings:**
    *   When a user visits the Browse page, React's `useEffect` hook triggers an HTTP GET request to `/api/listings`.
    *   The backend queries MongoDB for all listings with the status "Available". It also "populates" seller details by referencing the "Users" collection.
    *   The server returns a JSON array of these listings.
    *   React receives this array and dynamically renders the UI cards for each listing on the screen.

## 4. Real-Time Chat Workflow (Socket.IO & Encryption)
This is the most complex interaction, involving both standard HTTP and real-time WebSockets.
*   **Phase 1: Room Setup (HTTP)**
    *   When a buyer clicks "Message Seller" on a listing, React sends an HTTP POST to `/api/chat/rooms`.
    *   The backend checks if a chat room already exists between this buyer and seller for this specific listing. If not, it creates one and generates a unique AES-256-GCM encryption key for that specific room.
*   **Phase 2: Live Connection (WebSockets)**
    *   The React client connects to the server via Socket.IO and emits a `join_room` event with the room ID.
    *   The Node.js backend places the user's socket connection into a specific logical room, isolating their messages.
*   **Phase 3: Sending a Message**
    *   The buyer types a message and hits send. React emits a `send_message` event over the socket.
    *   The Node.js server receives the plaintext message. It uses the Node.js `crypto` module to **encrypt** the message (AES-256-GCM) using the room's unique key.
    *   Mongoose saves the encrypted ciphertext, IV, and auth tag to the database.
    *   The server then broadcasts a `new_message` event containing the **decrypted** text *only* to the sockets currently connected to that specific room.
    *   The recipient's React client receives this event and instantly updates the chat UI, making the message appear without requiring a page refresh.
