let playlist = [];
let currentTrackIndex = 0;
let ytPlayer = null;

const urlInput = document.getElementById("urlInput");
const tracksContainer = document.getElementById("tracksContainer");
const carouselTrack = document.getElementById("carouselTrack");
const currentInfo = document.getElementById("currentInfo");
const playBtn = document.getElementById("playBtn");
const playbackDot = document.getElementById("playbackDot");

window.onYouTubeIframeAPIReady = function () {
  const savedData = localStorage.getItem("myYoutubePlaylist");
  if (savedData) {
    playlist = JSON.parse(savedData);
    renderPlaylistUI();
    updateCarousel();
  }

  ytPlayer = new YT.Player("yt-player-container", {
    height: "1",
    width: "1",
    videoId: playlist.length > 0 ? playlist[0].id : "",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
};

function onPlayerReady() {
  if (playlist.length > 0) {
    currentInfo.textContent = `Ready: ${playlist[0].name}`;
  } else {
    currentInfo.textContent = "No track loaded";
  }
}

function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  if (url.includes("v=")) {
    const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  const slashMatch = url.match(
    /(?:embed\/|watch\/|shorts\/|v\/|be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (slashMatch) return slashMatch[1];
  if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  return null;
}

function addTrack() {
  const urlValue = urlInput.value.trim();
  const videoId = extractVideoId(urlValue);

  if (!videoId) {
    alert("Invalid link! Paste a standard URL or the 11-char ID.");
    return;
  }

  const trackName = "Track (" + videoId + ")";
  playlist.push({ id: videoId, name: trackName });

  localStorage.setItem("myYoutubePlaylist", JSON.stringify(playlist));
  urlInput.value = "";

  renderPlaylistUI();
  updateCarousel();

  if (playlist.length === 1 && ytPlayer) {
    loadTrack(0, false);
  }
}

function renderPlaylistUI() {
  tracksContainer.innerHTML = "";
  playlist.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = `track-item ${index === currentTrackIndex ? "active" : ""}`;
    item.innerHTML = `
            <span class="track-name">${index + 1}. ${track.name}</span>
            <button class="del-btn" onclick="deleteTrack(${index}, event)">✕</button>
          `;
    item.addEventListener("click", () => loadTrack(index, true));
    tracksContainer.appendChild(item);
  });
}

function updateCarousel() {
  carouselTrack.innerHTML = "";
  if (playlist.length === 0) {
    carouselTrack.innerHTML = `
            <div class="carousel-card card-center">
              <div class="card-content">
                <div class="card-title">No Tracks Loaded</div>
                <div class="card-subtitle">Queue is empty</div>
              </div>
            </div>`;
    return;
  }

  playlist.forEach((track, index) => {
    const card = document.createElement("div");
    let positionClass = "card-hidden";
    const offset = index - currentTrackIndex;

    if (offset === 0) positionClass = "card-center";
    else if (offset === -1) positionClass = "card-left";
    else if (offset === 1) positionClass = "card-right";
    else if (offset === -2) positionClass = "card-far-left";
    else if (offset === 2) positionClass = "card-far-right";

    card.className = `carousel-card ${positionClass}`;

    // Optional: Add custom fetched background thumbnail fallback from YT API structure natively
    const thumbUrl = `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`;
    card.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.85)), url('${thumbUrl}')`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";

    card.innerHTML = `
            <div class="card-content">
              <div class="card-title">${track.name}</div>
              <div class="card-subtitle">YouTube Track</div>
            </div>
          `;

    card.addEventListener("click", () => {
      if (index !== currentTrackIndex) loadTrack(index, true);
    });
    carouselTrack.appendChild(card);
  });
}

function loadTrack(index, autoPlay = true) {
  if (index < 0 || index >= playlist.length || !ytPlayer) return;
  currentTrackIndex = index;

  renderPlaylistUI();
  updateCarousel();

  if (autoPlay) {
    ytPlayer.loadVideoById(playlist[currentTrackIndex].id);
    playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    playbackDot.classList.add("playing");
  } else {
    ytPlayer.cueVideoById(playlist[currentTrackIndex].id);
    currentInfo.textContent = `Loaded: ${playlist[currentTrackIndex].name}`;
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    playbackDot.classList.remove("playing");
  }
}

function togglePlayback() {
  if (!ytPlayer || playlist.length === 0) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    playbackDot.classList.remove("playing");
  } else {
    ytPlayer.playVideo();
    playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    playbackDot.classList.add("playing");
  }
}

function playNext() {
  if (currentTrackIndex + 1 < playlist.length) {
    loadTrack(currentTrackIndex + 1, true);
  }
}

function playPrevious() {
  if (currentTrackIndex - 1 >= 0) {
    loadTrack(currentTrackIndex - 1, true);
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    playbackDot.classList.add("playing");

    if (ytPlayer.setPlaybackQuality) {
      ytPlayer.setPlaybackQuality("small");
    }

    if (ytPlayer.getVideoData && ytPlayer.getVideoData().title) {
      const realTitle = ytPlayer.getVideoData().title;
      playlist[currentTrackIndex].name = realTitle;
      currentInfo.textContent = realTitle;
      localStorage.setItem("myYoutubePlaylist", JSON.stringify(playlist));

      renderPlaylistUI();
      updateCarousel();
    }
  }
  if (event.data === YT.PlayerState.PAUSED) {
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    playbackDot.classList.remove("playing");
  }
  if (event.data === YT.PlayerState.ENDED) {
    if (currentTrackIndex + 1 < playlist.length) {
      loadTrack(currentTrackIndex + 1, true);
    } else {
      currentInfo.textContent = "Playlist completed.";
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playbackDot.classList.remove("playing");
    }
  }
}

function onPlayerError(event) {
  console.error("YT Player Error:", event.data);
  currentInfo.textContent = "Error playing track. Skipping...";
  playbackDot.classList.remove("playing");
  setTimeout(() => {
    if (currentTrackIndex + 1 < playlist.length)
      loadTrack(currentTrackIndex + 1, true);
  }, 2000);
}

function deleteTrack(index, event) {
  event.stopPropagation();
  playlist.splice(index, 1);
  localStorage.setItem("myYoutubePlaylist", JSON.stringify(playlist));
  if (playlist.length === 0) {
    clearPlaylist();
  } else {
    if (index === currentTrackIndex) {
      loadTrack(0, false);
    } else if (index < currentTrackIndex) {
      currentTrackIndex--;
      renderPlaylistUI();
      updateCarousel();
    } else {
      renderPlaylistUI();
      updateCarousel();
    }
  }
}

function clearPlaylist() {
  localStorage.removeItem("myYoutubePlaylist");
  playlist = [];
  currentTrackIndex = 0;
  if (ytPlayer) ytPlayer.stopVideo();
  tracksContainer.innerHTML = "";
  currentInfo.textContent = "No track loaded";
  playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
  playbackDot.classList.remove("playing");
  updateCarousel();
}

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// --- CUSTOM SLIDING BACKGROUND WITH DEFAULT & USER HISTORY LOGIC ---

const bgPanel = document.getElementById("bgPanel");
const bgUrlInput = document.getElementById("bgUrlInput");
const bgHistoryStack = document.getElementById("bgHistoryStack");
const bgChangerBtn = document.getElementById("bgChangerBtn");

// 1. YOUR DEFAULT BACKGROUNDS: Put your favorite high-quality URLs here!
const myDefaultBackgrounds = [
  "https://img.magnific.com/free-photo/medium-shot-anime-characters-hugging_23-2150970867.jpg?t=st=1784403015~exp=1784406615~hmac=b8082cb1d022ed5096c311ed0b29953c8debc501f204e8878369a58201f0ce06&w=1480",
  "https://img.magnific.com/free-photo/anime-night-sky-illustration_23-2151684326.jpg?t=st=1784402832~exp=1784406432~hmac=bfd7537e5a298418ca7d59c4174e247a87ff0137abd59f899b5dd27d0e25619f&w=1480",
  "https://wallpaperaccess.com/full/937696.jpg",
  "https://a-static.besthdwallpaper.com/dark-sunset-wallpaper-3554x1999-81373_53.jpg",
];

// 2. Check storage. If empty, load YOUR default backgrounds automatically!
let recentBackgrounds = JSON.parse(localStorage.getItem("recentBgs"));

if (!recentBackgrounds || recentBackgrounds.length === 0) {
  recentBackgrounds = [...myDefaultBackgrounds];
  localStorage.setItem("recentBgs", JSON.stringify(recentBackgrounds));
}

// 3. Core renderer to handle body style updates and sync the button background image
function applyBackgroundStyle(url) {
  if (!url) return;

  const bgValue =
    url.startsWith("http") || url.startsWith("data:") ? `url('${url}')` : url;

  // Set global layout look-and-feel
  document.body.style.backgroundImage = bgValue;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundAttachment = "fixed";

  // Match the button background to the active app background
  // bgChangerBtn.style.backgroundImage = bgValue;
}

// 4. Load preferences on boot (sets the active background)
function initBackgroundEngine() {
  const activeBg = localStorage.getItem("customUserBackground");
  if (activeBg) {
    applyBackgroundStyle(activeBg);
  } else {
    // If it's a first-time user, set the very first default image as their active background
    applyBackgroundStyle(recentBackgrounds[0]);
  }
  renderHistoryStack();
}

// 5. Draw mini vertical preview node elements dynamically
function renderHistoryStack() {
  bgHistoryStack.innerHTML = "";
  recentBackgrounds.forEach((bgUrl) => {
    const node = document.createElement("div");
    node.className = "bg-history-node";
    node.style.backgroundImage = `url('${bgUrl}')`;

    node.addEventListener("click", () => {
      localStorage.setItem("customUserBackground", bgUrl);
      applyBackgroundStyle(bgUrl);
      // Shift clicked item to top of history tracking array queue
      pushToHistory(bgUrl);
    });

    bgHistoryStack.appendChild(node);
  });
}

// 6. Append unique custom selections without hitting infinite limits
function pushToHistory(url) {
  if (!url || !url.startsWith("http")) return;

  // Filter out duplicate entries if re-selected
  recentBackgrounds = recentBackgrounds.filter((item) => item !== url);

  // Prepend entry into array front index position
  recentBackgrounds.unshift(url);

  // Keep only the 4 most recent backgrounds
  if (recentBackgrounds.length > 4) {
    recentBackgrounds.pop();
  }

  localStorage.setItem("recentBgs", JSON.stringify(recentBackgrounds));
  renderHistoryStack();
}

// 7. Open/Close Drawer Toggle
function toggleBgPanel() {
  bgPanel.classList.toggle("panel-open");
  if (bgPanel.classList.contains("panel-open")) {
    bgUrlInput.focus();
  }
}

// 8. Action Execution Handler for the text field submission
function saveCustomBackground() {
  const urlValue = bgUrlInput.value.trim();

  if (!urlValue) {
    alert("Please paste a valid image link first!");
    return;
  }

  // Persist selections inside browser memory pools
  localStorage.setItem("customUserBackground", urlValue);
  applyBackgroundStyle(urlValue);
  pushToHistory(urlValue);

  // Clear down presentation fields
  bgUrlInput.value = "";
  bgPanel.classList.remove("panel-open");
}

bgUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveCustomBackground();
});

// Run immediately to load user preferences on start
initBackgroundEngine();
