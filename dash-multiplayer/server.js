const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("../public"));

let players = {};
let gameStarted = false;
const MAX_SPEED = 200;
const MIN_X = -3;
const MAX_X = 3;
const TRACK_LENGTH = 15000;

io.on("connection", socket => {
  console.log("Joueur connecté:", socket.id);

  socket.on("joinLobby", ({ pseudo, role, skin }) => {
    const allowedSkins = ["red","blue","green","yellow"];
    players[socket.id] = {
      pseudo,
      role, 
      x:0, speed:0, pos:0,
      finished:false, time:null,
      skin:allowedSkins.includes(skin)?skin:"red",
      ready:false
    };
    io.emit("lobbyUpdate", players);
  });

  socket.on("playerReady", () => {
    if(!players[socket.id]) return;
    players[socket.id].ready=true;
    const allReady=Object.values(players).every(p=>p.ready||p.role==="spectator");
    if(allReady && !gameStarted) startCountdown();
  });

  socket.on("chatMessage", msg => {
    if(!players[socket.id]) return;
    io.emit("chatMessage",{pseudo:players[socket.id].pseudo,msg});
  });

  socket.on("updatePlayer", data => {
    if(!players[socket.id]||players[socket.id].role==="spectator") return;
    data.speed=Math.min(data.speed,MAX_SPEED);
    data.x=Math.max(MIN_X,Math.min(MAX_X,data.x));
    players[socket.id].x=data.x;
    players[socket.id].speed=data.speed;
    players[socket.id].pos+=data.speed*0.016;
    
    if(players[socket.id].pos>=TRACK_LENGTH){
      players[socket.id].pos=TRACK_LENGTH;
      if(!players[socket.id].finished){
        players[socket.id].finished=true;
        players[socket.id].time=Date.now();
        updateRanking();
      }
    }
    socket.broadcast.emit("updateRemote",{id:socket.id,data:players[socket.id]});
  });

  socket.on("disconnect", ()=>{
    delete players[socket.id];
    io.emit("removePlayer", socket.id);
  });
});

function startCountdown(){
  gameStarted=true;
  let count=3;
  const interval=setInterval(()=>{
    io.emit("countdown",count);
    count--;
    if(count<0){
      clearInterval(interval);
      io.emit("startGame",Date.now());
    }
  },1000);
}

function updateRanking(){
  const ranking = Object.values(players)
    .filter(p=>p.finished)
    .sort((a,b)=>a.time-b.time)
    .map(p=>({pseudo:p.pseudo,time:p.time}));
  io.emit("rankingUpdate",ranking);
}

server.listen(3000,()=>console.log("Serveur lancé sur http://localhost:3000"));
