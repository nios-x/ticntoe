const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const helmet = require('helmet');
const compression = require('compression');


const app = express();
const server = http.createServer(app);
const io = new Server(server);
const players = new Map();
const boards = new Map();

app.use(helmet());
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["*"],       // Allows all sources for scripts, styles, etc.
      scriptSrc: ["*"],        // Allows all scripts
      imgSrc: ["*"],           // Allows all images
      styleSrc: ["*"],         // Allows all styles
      connectSrc: ["*"],       // Allows all connections (e.g., for AJAX)
      frameSrc: ["*"],         // Allows all frames
      // Add other directives as needed
    },
  },
}));
const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontal
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // vertical
  [0, 4, 8], [2, 4, 6]             // diagonal
];

const checkWinner = (board) => {
  for (const combination of winningCombinations) {
    const [a, b, c] = combination;
    if (board[a] !== -1 && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // return the winning player (0 or 1)
    }
  }
  return null; // no winner
};
const path = require('path');

app.use(express.static(path.join(__dirname, 'dist')));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

io.on("connection", (socket) => {
  console.log("Connected", socket.id);
    
  socket.on("clickOnBtn", ({ index, xo }) => {
    const playerInfo = players.get(socket.id);
    if (!playerInfo) {
      console.error(`Player info not found for socket ID: ${socket.id}`);
      return; // Ensure player exists
    }
    
    const otherplayerid = playerInfo.isfriend;
    if (!otherplayerid) return; // Ensure there's an opponent

    const id = otherplayerid > socket.id ? `${otherplayerid}_${socket.id}` : `${socket.id}_${otherplayerid}`;
    const board = boards.get(id);
    
    if (!board) {
      console.error(`Board not found for game ID: ${id}`);
      return; // Ensure board exists
    }
    
    board[index - 1] = xo; // Update board
    boards.set(id, board); // Save updated board

    const winner = checkWinner(board);
    if (winner !== null) {
      io.to(otherplayerid).emit("gameOver", { winner });
      socket.emit("gameOver", { winner });
      return; // Exit after emitting the game over event
    }

    const isDraw = board.every(cell => cell !== -1);
    if (isDraw) {
      io.to(otherplayerid).emit("gameOver", { winner: -1 }); // -1 indicates a draw
      socket.emit("gameOver", { winner: -1 });
      return; // Exit after emitting the game over event
    }

    // Notify both players of the updated board
    socket.emit("start2", { board, chance: false });
    io.to(otherplayerid).emit("start2", { board, chance: true });
  });

  socket.on("restartGame", () => {
    const playerInfo = players.get(socket.id);
    if (!playerInfo) {
      console.error(`Player info not found for socket ID: ${socket.id}`);
      return; // Ensure player exists
    }
    
    const otherplayerid = playerInfo.isfriend;
    if (otherplayerid) {
      const id = otherplayerid > socket.id ? `${otherplayerid}_${socket.id}` : `${socket.id}_${otherplayerid}`;
      boards.delete(id); // Remove the game board

      // Reset players' friend status
      players.set(socket.id, { name: playerInfo.name, isfriend: false });
      players.set(otherplayerid, { name: players.get(otherplayerid).name, isfriend: false });

      // Notify both players to restart the game
      io.to(socket.id).emit("restartGame");
      io.to(otherplayerid).emit("restartGame");
    }
  });

  socket.on("submitName", ({ name }) => {
    players.set(socket.id, { name, isfriend: false });
    
    // Attempt to find a partner for the new player
    players.forEach((v, k) => {
      if (socket.id !== k && v.isfriend === false) {
        players.set(socket.id, { name, isfriend: k, xo: 1 });
        players.set(k, { name: v.name, isfriend: socket.id, xo: 0 });
      }
    });
  
    const otherplayerid = players.get(socket.id)?.isfriend;
    if (otherplayerid) {
      const id = otherplayerid > socket.id ? `${otherplayerid}_${socket.id}` : `${socket.id}_${otherplayerid}`;
      boards.set(id, Array(9).fill(-1)); // Initialize new board

      socket.emit("start", { chance: false, xo: players.get(socket.id).xo, friendName: players.get(otherplayerid).name });
      io.to(otherplayerid).emit("start", { chance: true, xo: players.get(otherplayerid).xo, friendName: players.get(socket.id).name });
    } else {
      socket.emit("wait", {});
    }
    console.log(players);
  });

  socket.on("disconnect", () => {
    const playerInfo = players.get(socket.id);
    if (playerInfo) {
      const otherplayerid = playerInfo.isfriend;
      if (otherplayerid) {
        boards.delete(`${socket.id}_${otherplayerid}`);
        boards.delete(`${otherplayerid}_${socket.id}`);
      }
      players.delete(socket.id);
    }
    console.log("Disconnected: " + socket.id);
  });
});

server.listen(3000, () => {
  console.log('Listening on :3000');
});
