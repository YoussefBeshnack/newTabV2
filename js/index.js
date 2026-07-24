let playlist = [];
let currentTrackIndex = 0;
let ytPlayer = null;
let hasStartedPlaying = false; // add near your other top-level state vars

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

let cardElements = new Map(); // index -> card element

function getPositionClass(offset) {
  switch (offset) {
    case 0:
      return "card-center";
    case -1:
      return "card-left";
    case 1:
      return "card-right";
    case -2:
      return "card-far-left";
    case 2:
      return "card-far-right";
    default:
      return "card-hidden";
  }
}

function createCard(track, index) {
  const card = document.createElement("div");
  card.className = "carousel-card card-hidden"; // starting state
  card.dataset.index = index;

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
    const i = parseInt(card.dataset.index, 10);
    if (i !== currentTrackIndex) loadTrack(i, true);
  });

  return card;
}

function updateCarousel() {
  if (playlist.length === 0) {
    carouselTrack.innerHTML = `
      <div class="carousel-card card-center">
        <div class="card-content">
          <div class="card-title">No Tracks Loaded</div>
          <div class="card-subtitle">Queue is empty</div>
        </div>
      </div>`;
    cardElements.clear();
    return;
  }

  // Remove any leftover/orphan nodes not tracked by cardElements
  // (e.g. the initial "No Tracks Loaded" placeholder from the HTML)
  const trackedNodes = new Set(cardElements.values());
  Array.from(carouselTrack.children).forEach((child) => {
    if (!trackedNodes.has(child)) {
      child.remove();
    }
  });

  // Drop any cards whose index no longer exists in the playlist
  cardElements.forEach((el, key) => {
    if (key >= playlist.length) {
      el.remove();
      cardElements.delete(key);
    }
  });

  playlist.forEach((track, index) => {
    let card = cardElements.get(index);

    if (!card) {
      card = createCard(track, index);
      carouselTrack.appendChild(card);
      cardElements.set(index, card);
      void card.offsetWidth;
    } else {
      const titleEl = card.querySelector(".card-title");
      if (titleEl && titleEl.textContent !== track.name) {
        titleEl.textContent = track.name;
      }
    }

    const offset = index - currentTrackIndex;
    card.className = `carousel-card ${getPositionClass(offset)}`;
  });
}

function loadTrack(index, autoPlay = true) {
  if (index < 0 || index >= playlist.length || !ytPlayer) return;
  currentTrackIndex = index;
  hasStartedPlaying = false; // reset — we haven't confirmed real playback yet

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
    hasStartedPlaying = true; // confirms this track genuinely played

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
    if (!hasStartedPlaying) {
      // This track never actually played — treat it like an error instead
      // of silently chaining into another instant "ended" -> infinite loop.
      console.warn(
        "Track ended without playing, likely blocked/unavailable:",
        playlist[currentTrackIndex],
      );
      onPlayerError({ data: "phantom-end" });
      return;
    }
    loadTrack((currentTrackIndex + 1) % playlist.length, true);
  }
}

function onPlayerError(event) {
  console.error("YT Player Error:", event.data);
  currentInfo.textContent = "Error playing track. Skipping...";
  playbackDot.classList.remove("playing");

  setTimeout(() => {
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    // Stop the cascade if we've wrapped all the way back with no valid track found
    if (playlist.length > 1 && nextIndex !== currentTrackIndex) {
      loadTrack(nextIndex, true);
    } else {
      currentInfo.textContent = "No playable tracks found.";
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    }
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

// --- PLAYLIST IMPORT / EXPORT SYSTEM ---

// 1. EXPORT: Packs your current queue into a file and triggers a browser download
function exportPlaylist() {
  if (playlist.length === 0) {
    alert("Your playlist is empty! Add some tracks before exporting.");
    return;
  }

  // Convert current runtime playlist array into string format
  const dataStr = JSON.stringify(playlist, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create an invisible anchor tag to click programmatically
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.download = "my-lofi-playlist.json";
  document.body.appendChild(downloadAnchor);

  downloadAnchor.click();

  // Cleanup browser memory traces
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}

// 2. IMPORT: Intercepts the hidden input picker upload event
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      // Safety Validation: Make sure the uploaded file is actually a structured array list
      if (Array.isArray(importedData)) {
        // Overwrite active runtime array reference
        playlist = importedData;
        currentTrackIndex = 0; // Reset focus back to the beginning track

        // Save the updated list permanently to storage
        localStorage.setItem("myYoutubePlaylist", JSON.stringify(playlist));

        // Synchronize and redraw all components
        renderPlaylistUI();
        updateCarousel();

        // Safely load the first track into the media engine without breaking autoplay rules
        if (ytPlayer && playlist.length > 0) {
          loadTrack(0, false);
        }

        alert("Playlist imported perfectly!");
      } else {
        alert(
          "Oops! The file structure doesn't match a standard playlist format.",
        );
      }
    } catch (err) {
      alert("Error reading file. Make sure it's a valid JSON file!");
    }
  };

  reader.readAsText(file);

  // Reset selector value tracking so users can repeatedly re-upload identical filenames later
  event.target.value = "";
}

// --- BOTTOM LEFT FLOATING VOLUME PANEL ENGINE ---

let isMuted = false;
let preMuteVolume = 80;

// 1. Toggles open/close state of the slider window
function toggleVolumePanel() {
  const container = document.getElementById("volSliderContainer");
  container.classList.toggle("active");
}

// 2. Volume modification engine linked to the player
function handleVolumeChange(value) {
  if (!ytPlayer) return;

  const volume = parseInt(value);
  ytPlayer.setVolume(volume);

  if (volume > 0 && isMuted) {
    isMuted = false;
    ytPlayer.unMute();
  }

  updateVolumeIcon(volume);
}

// 3. Dynamically swap fontAwesome icon classes based on level variables
function updateVolumeIcon(volume) {
  const icon = document.getElementById("volBtnIcon");
  if (!icon) return;

  if (volume == 0 || isMuted) {
    icon.className = "fa-solid fa-volume-xmark";
  } else if (volume < 50) {
    icon.className = "fa-solid fa-volume-low";
  } else {
    icon.className = "fa-solid fa-volume-high";
  }
}
