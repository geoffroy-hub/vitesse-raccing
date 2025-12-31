const socket = io();
let remotePlayers = {};
let myRole=null;
let playerX=0,speed=0,pos=0;
const SKINS={red:"images/car_red.png",blue:"images/car_blue.png",green:"images/car_green.png",yellow:"images/car_yellow.png"};
const N=70,segL=200,roadW=4000,H=1500,halfWidth=400,width=800,height=500;
let lines=[],inGame=false,start=0;

// Input
const KEYS={};
addEventListener("keydown",e=>{KEYS[e.code]=true;});
addEventListener("keyup",e=>{KEYS[e.code]=false;});

// Lobby
function join(role){
  myRole=role;
  const pseudo=document.getElementById("pseudo").value;
  const skin=document.getElementById("skin").value;
  socket.emit("joinLobby",{pseudo,role,skin});
  socket.emit("playerReady");
  document.getElementById("home").style.display="none";
}

// Chat
document.getElementById("chatInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){ socket.emit("chatMessage",e.target.value); e.target.value=""; }
});
socket.on("chatMessage",data=>{
  const p=document.createElement("p"); p.innerText=`${data.pseudo}: ${data.msg}`;
  document.getElementById("messages").appendChild(p);
});

// Remote update
socket.on("updateRemote",player=>{
  if(remotePlayers[player.id]){
    remotePlayers[player.id].x=player.data.x;
    remotePlayers[player.id].pos=player.data.pos;
  } else createRemotePlayer(player.id,player.data);
});
socket.on("removePlayer",id=>{
  if(remotePlayers[id]){ remotePlayers[id].element.remove(); delete remotePlayers[id]; }
});
socket.on("rankingUpdate",ranking=>{
  console.clear();
  ranking.forEach((p,i)=>console.log(`${i+1}. ${p.pseudo} - ${(p.time/1000).toFixed(2)}s`));
});
socket.on("countdown",n=>document.getElementById("text").innerText=n>0?n:"GO!");
socket.on("startGame",serverTime=>{ start=serverTime; inGame=true; });

// Remote player creation
function createRemotePlayer(id,data){
  const car=document.createElement("div");
  car.classList.add("remote");
  car.style.background=`url(${SKINS[data.skin]})`;
  document.getElementById("road").appendChild(car);
  remotePlayers[id]={element:car,x:data.x,pos:data.pos};
}

// 3D Line class
class Line{constructor(){this.x=this.y=this.z=0;this.X=this.Y=this.W=0;this.curve=0;this.scale=0;this.elements=[];this.special=null;}
project(camX,camY,camZ){this.scale=0.2/(this.z-camZ);this.X=(1+this.scale*(this.x-camX))*halfWidth;this.Y=Math.ceil((1-this.scale*(this.y-camY))*height/2);this.W=this.scale*roadW*halfWidth;}
clearSprites(){for(let e of this.elements)e.style.background="transparent";}
drawSprite(depth,layer,sprite,offset){let destX=this.X+this.scale*halfWidth*offset;let destY=this.Y+4;let destW=(50*this.W)/265;let destH=(36*this.W)/265;let obj=layer instanceof Element?layer:this.elements[layer+6];obj.style.background=`url('${sprite}') no-repeat`;obj.style.backgroundSize=`${destW}px ${destH}px`;obj.style.left=destX+"px";obj.style.top=destY+"px";obj.style.width=destW+"px";obj.style.height=destH+"px";obj.style.zIndex=depth;}}

// Init lines and decorations
for(let i=0;i<N;i++){
  let line=new Line();
  line.z=i*segL+270;
  for(let j=0;j<8;j++){let el=document.createElement("div");document.getElementById("road").appendChild(el);line.elements.push(el);}
  // Trees
  if(i%10===0){
    let treeLeft=document.createElement("div");
    treeLeft.classList.add("tree");
    treeLeft.style.background="url('images/tree.png')";
    document.getElementById("road").appendChild(treeLeft);
    line.elements.push(treeLeft);
    let treeRight=document.createElement("div");
    treeRight.classList.add("tree");
    treeRight.style.background="url('images/tree.png')";
    document.getElementById("road").appendChild(treeRight);
    line.elements.push(treeRight);
  }
  // Clouds
  if(i%15===0){
    let cloud=document.createElement("div");
    cloud.classList.add("cloud");
    cloud.style.background="url('images/cloud.jpg')";
    document.getElementById("road").appendChild(cloud);
    line.elements.push(cloud);
  }
  // Finish
  if(i===N-5){
    let finish=document.createElement("div");
    finish.classList.add("finish");
    finish.style.background="url('images/finish.png')";
    document.getElementById("road").appendChild(finish);
    line.elements.push(finish);
  }
  lines.push(line);
}

// Game loop
function update(step){
  if(inGame && myRole==="player"){
    if(KEYS.ArrowRight) playerX+=0.007*step*speed;
    if(KEYS.ArrowLeft) playerX-=0.007*step*speed;
    playerX=Math.max(-3,Math.min(3,playerX));
    if(KEYS.KeyS)speed+=38*step;
    else if(KEYS.KeyW)speed-=80*step;
    else speed-=40*step;
    speed=Math.max(0,Math.min(200,speed));
    pos+=speed*step;
    socket.emit("updatePlayer",{x:playerX,speed:speed,pos:pos});
  }

  // Update remote
  for(let id in remotePlayers){
    let p=remotePlayers[id];
    p.element.style.left=(400+p.x*100)+"px";
    p.element.style.top=(500-p.pos*0.05)+"px";
  }
}

// Loop
let then=Date.now();
function loop(){
  const now=Date.now();
  const delta=(now-then)/1000;
  then=now;
  update(delta);
  requestAnimationFrame(loop);
}
loop();
