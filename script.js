const TMDB = "https://api.themoviedb.org/3";
const KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const IMG = "https://image.tmdb.org/t/p/w300";

let profile = localStorage.getItem("profile") || null;

// ---------- PROFILE ----------
function selectProfile(name) {
  profile = name;
  localStorage.setItem("profile", name);

  document.getElementById("profileScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("profileName").innerText = name;

  init();
}

// ---------- INIT ----------
function init() {
  loadAll();
  loadContinue();
  wireSearch();
}

// ---------- SEARCH ----------
function wireSearch() {
  document.getElementById("searchBtn").onclick = async () => {
    const q = document.getElementById("searchInput").value;
    const res = await fetch(`${TMDB}/search/movie?api_key=${KEY}&query=${q}`);
    const data = await res.json();
    render(data.results, document.getElementById("popularRow"));
  };
}

// ---------- LOAD ----------
async function loadAll() {
  render(await get("/movie/popular"), popularRow);
  render(await get("/movie/top_rated"), topRatedRow);
  render(await get("/discover/movie?with_genres=28"), actionRow);
  render(await get("/discover/movie?with_genres=27"), horrorRow);
}

async function get(path) {
  const res = await fetch(`${TMDB}${path}?api_key=${KEY}`);
  const data = await res.json();
  return data.results;
}

// ---------- RENDER ----------
function render(items, container) {
  container.innerHTML = "";

  items.forEach(m => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${IMG + m.poster_path}">
    `;

    div.onclick = () => playMovie(m);

    container.appendChild(div);
  });
}

// ---------- PLAY MOVIE + TRAILER ----------
async function playMovie(movie) {
  saveContinue(movie);

  // try trailer
  const res = await fetch(`${TMDB}/movie/${movie.id}/videos?api_key=${KEY}`);
  const data = await res.json();

  const trailer = data.results.find(v => v.type === "Trailer");

  if (trailer) {
    document.getElementById("player").src =
      `https://www.youtube.com/embed/${trailer.key}`;
  }
}

// ---------- CONTINUE WATCHING ----------
function saveContinue(movie) {
  let data = JSON.parse(localStorage.getItem("continue_" + profile) || "[]");

  data = data.filter(x => x.id !== movie.id);
  data.unshift(movie);

  localStorage.setItem("continue_" + profile, JSON.stringify(data.slice(0, 10)));

  loadContinue();
}

function loadContinue() {
  const container = document.getElementById("continueRow");
  if (!container) return;

  const data = JSON.parse(localStorage.getItem("continue_" + profile) || "[]");

  container.innerHTML = "";

  data.forEach(m => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `<img src="${IMG + m.poster_path}">`;
    div.onclick = () => playMovie(m);

    container.appendChild(div);
  });
}

// expose
window.selectProfile = selectProfile;
