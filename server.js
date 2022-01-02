const dotenv = require("dotenv");
const express = require("express");
var { chats } = require("./data/data.js");
var cors = require("cors");
const connectDB = require("./config/db.js");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const path = require("path");

const app = express();
dotenv.config();
app.use(cors());

connectDB();
app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

//--------------------Deployment---------------------

// const __dirname1 = path.resolve();
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.resolve(process.cwd(), "/frontend/build")));
//   app.get("*", (req, res) => {
//     res.sendFile(path.resolve(process.cwd(), "/frontend/build/index.html"));
//   });
// } else {
//   app.get("/", (req, res) => {
//     res.send("API running");
//   });
// }
//--------------------Deployment---------------------

app.get("/", (req, res) => {
  res.send("API running");
});
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`Server started on port ${PORT}`));

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  //this takes user data from frontend
  //and the user creates a new room exclusive for itself
  socket.on("setup", (userData) => {
    socket.join(userData._id); //create a new room with user id
    socket.emit("connected");
  });

  //this takes room id from frontend
  //and joins the user to this room (chat room)
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room" + room);
  });

  socket.on("typing", (room) => {
    socket.in(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing");
  });

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) {
      return console.log("chat.users not defined");
    }

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
