// ---------- silhouette outlines ----------
const shapes = {
  straight: "M88,20 L232,20 L256,90 L256,300 L250,590 L205,590 L202,320 L160,300 L118,320 L115,590 L70,590 L64,300 L64,90 Z",
  baggy: "M80,20 L240,20 L270,90 L280,260 L292,590 L192,590 L195,330 L160,300 L125,330 L128,590 L28,590 L40,260 L50,90 Z",
  flare: "M100,20 L220,20 L212,90 L192,380 L262,590 L180,590 L175,330 L160,300 L145,330 L140,590 L58,590 L128,380 L108,90 Z",
  cargo: "M80,20 L240,20 L270,90 L278,260 L288,590 L192,590 L195,330 L160,300 L125,330 L128,590 L32,590 L42,260 L50,90 Z"
};

const zoneNames = {
  waist: "Waist", upperLeft: "Upper left", upperRight: "Upper right",
  lowerLeft: "Lower left", lowerRight: "Lower right", pocket: "Pocket patch"
};
const zoneOrder = ["waist","upperLeft","upperRight","lowerLeft","lowerRight","pocket"];

const washes = [
  { name: "Raw indigo", hex: "#26314f" },
  { name: "Stonewash", hex: "#6f6a62" },
  { name: "Jet black", hex: "#181816" },
  { name: "Bleach bone", hex: "#e4dfd2" },
  { name: "Rust oxide", hex: "#7a4b32" },
  { name: "Acid grey", hex: "#5c6058" },
  { name: "Mud brown", hex: "#4a3c2f" },
  { name: "Cold blue", hex: "#3a4d68" }
];

let state = {
  shape: "straight",
  selectedZone: "waist",
  colors: {
    waist: "#26314f",
    upperLeft: "#6f6a62",
    upperRight: "#26314f",
    lowerLeft: "#181816",
    lowerRight: "#6f6a62",
    pocket: "#7a4b32"
  }
};

function setShape(shape){
  state.shape = shape;
  const d = shapes[shape];
  document.getElementById("clipPath").setAttribute("d", d);
  document.getElementById("outlinePath").setAttribute("d", d);
  document.getElementById("cargoFlaps").style.display = shape === "cargo" ? "block" : "none";
  document.querySelectorAll("#tabs button").forEach(b=>{
    b.classList.toggle("active", b.dataset.shape === shape);
  });
}

function renderZones(){
  zoneOrder.forEach(z=>{
    document.getElementById("zone-"+z).setAttribute("fill", state.colors[z]);
  });
}

function renderSwatches(){
  const grid = document.getElementById("swatches");
  grid.innerHTML = "";
  washes.forEach(w=>{
    const div = document.createElement("div");
    div.className = "swatch";
    div.style.background = w.hex;
    div.title = w.name;
    if(state.colors[state.selectedZone] === w.hex) div.classList.add("active");
    div.innerHTML = "<small>"+w.name+"</small>";
    div.addEventListener("click", ()=>{
      state.colors[state.selectedZone] = w.hex;
      renderZones();
      renderSwatches();
      renderTagList();
      renderCount();
    });
    grid.appendChild(div);
  });
}

function renderTagList(){
  const list = document.getElementById("tagList");
  list.innerHTML = "";
  zoneOrder.forEach((z,i)=>{
    const row = document.createElement("div");
    row.className = "tag-row";
    row.innerHTML = `<span class="src">Src.0${i+1}</span><span class="zone-name">${zoneNames[z]}</span><span class="swatch-dot" style="background:${state.colors[z]}"></span>`;
    list.appendChild(row);
  });
}

function renderCount(){
  const unique = new Set(Object.values(state.colors));
  document.getElementById("sourceCount").textContent = unique.size;
}

function selectZone(zone){
  state.selectedZone = zone;
  document.getElementById("editingZone").textContent = zoneNames[zone];
  renderSwatches();
}

document.querySelectorAll(".zone").forEach(el=>{
  el.addEventListener("click", ()=> selectZone(el.dataset.zone));
});

document.querySelectorAll("#tabs button").forEach(btn=>{
  btn.addEventListener("click", ()=> setShape(btn.dataset.shape));
});

document.getElementById("randomizeBtn").addEventListener("click", ()=>{
  zoneOrder.forEach(z=>{
    const w = washes[Math.floor(Math.random()*washes.length)];
    state.colors[z] = w.hex;
  });
  renderZones();
  renderSwatches();
  renderTagList();
  renderCount();
});

document.getElementById("resetBtn").addEventListener("click", ()=>{
  state.colors = {
    waist: "#26314f", upperLeft: "#6f6a62", upperRight: "#26314f",
    lowerLeft: "#181816", lowerRight: "#6f6a62", pocket: "#7a4b32"
  };
  renderZones();
  renderSwatches();
  renderTagList();
  renderCount();
});

setShape("straight");
renderZones();
renderSwatches();
renderTagList();
renderCount();
selectZone("waist");

// ---------- lookbook placeholder tiles ----------
const lookCombos = [
  ["#26314f","#181816","#6f6a62"],
  ["#7a4b32","#26314f","#e4dfd2"],
  ["#181816","#5c6058","#3a4d68"],
  ["#e4dfd2","#4a3c2f","#26314f"],
  ["#6f6a62","#181816","#7a4b32"],
  ["#3a4d68","#26314f","#5c6058"],
  ["#181816","#e4dfd2","#6f6a62"],
  ["#4a3c2f","#3a4d68","#181816"]
];
const lookbook = document.getElementById("lookbook");
lookCombos.forEach((combo, i)=>{
  const look = document.createElement("div");
  look.className = "look";
  look.innerHTML = `
    <div class="patch" style="top:0;left:0;width:100%;height:34%;background:${combo[0]}"></div>
    <div class="patch" style="top:34%;left:0;width:50%;height:66%;background:${combo[1]}"></div>
    <div class="patch" style="top:34%;left:50%;width:50%;height:66%;background:${combo[2]}"></div>
    <div class="cap"><span>Look ${String(i+1).padStart(2,"0")}</span><span>3 sources</span></div>
  `;
  lookbook.appendChild(look);
});