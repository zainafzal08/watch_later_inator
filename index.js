let oauthClient;

const SINK_PLAYLIST_NAME = 'Watch Later Inator';

function setPage(id) {
  for (const e of document.querySelectorAll(`[data-page]`)) {
    e.style.removeProperty('display');
  }
  document.querySelector(`[data-page="${id}"]`).style.display = 'flex';
}

async function getSinkPlaylist() {
  let sinkPlaylist = localStorage.getItem('sink-playlist');

  if (!sinkPlaylist) {
    const r = await gapi.client.youtube.playlists.list({
      "part": ["id", "snippet"],
      "mine": true
    });

    let found = false;
    for (const item of r.result.items) {
      if (item.snippet.localized.title === SINK_PLAYLIST_NAME) {
        sinkPlaylist = item.id;
        console.log(item);
        localStorage.setItem('sink-playlist', sinkPlaylist);
        found = true;
        break;
      }
    }

    if (!found) {
      const r = await gapi.client.youtube.playlists.insert({
        "part": [
          "snippet,status"
        ],
        "resource": {
          "snippet": {
            "title": SINK_PLAYLIST_NAME,
            "description": "Auto-created playlist for watch later inator, do not edit the name.",
            "tags": [],
            "defaultLanguage": "en"
          },
          "status": {
            "privacyStatus": "private"
          }
        }
      });
      sinkPlaylist = r.id;
      localStorage.setItem('sink-playlist', sinkPlaylist);
    }
  }

  return sinkPlaylist;
}

function getIdFromLink(link) {
  const url = new URL(link);
  if (url.host.toLocaleLowerCase() === 'youtu.be') {
    return url.pathname.substring(1);
  }

  const id = url.searchParams.get('v');
  if (!id) {
    throw new Error('Invalid Link.');
  }
  return id;
}

function getThumbnail(snippet) {
  if (snippet.thumbnails.standard) return snippet.thumbnails.standard;
  if (snippet.thumbnails.default) return snippet.thumbnails.default;
  return snippet.thumbnails[Object.keys(snippet.thumbnails)[0]];
}

async function getTargetInformation(link) {
  const id = getIdFromLink(link);
  const r = await gapi.client.youtube.videos.list({
    "part": [
      "snippet"
    ],
    "id": [ id ]
  });

  if (r.result.items.length < 1) {
    throw new Error('Invalid Link.');
  }

  const video = r.result.items[0];
  return {
    title: video.snippet.title,
    thumbnail: getThumbnail(video.snippet)
  };
}

async function renderTargetPreview(link) {
  const t = await getTargetInformation(link);
  document.querySelector('#preview-thumbnail').style.backgroundImage = `url(${t.thumbnail.url})`;
  document.querySelector('#preview-title').innerText = t.title;
}

async function sendToYoutube(sinkId, link) {

  await gapi.client.youtube.playlistItems.insert({
    part: ["snippet"],
    resource: {
      snippet: {
        playlistId: sinkId,
        resourceId: {
          kind: "youtube#video",
          videoId: getIdFromLink(link)
        }
      }
    }
  });
}

function setUpAuth() {
  const authenticatedPromise = new Promise(resolve => {
    oauthClient = google.accounts.oauth2.initTokenClient({
      client_id: "428583190973-iifjdvdvvond48kvs9d2c6ot7cbp6pb8.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/youtube",
      prompt: '',
      callback: resolve
    });
  });
  return authenticatedPromise;
};

async function getGapi() {
  await new Promise(r => gapi.load('client', r));
  await gapi.client.setApiKey("AIzaSyBzYj-oMJJLIyXBs0g5SmbJtP-KlZ6sPxE");
  await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
}

const registerServiceWorker = async (src) => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(src, {
        scope: ".",
      });
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

function getLinkToAdd() {
  const url = new URL(location.href);
  if (url.searchParams.has('add')) {
    return decodeURI(url.searchParams.get('add'));
  }
  if (url.searchParams.has('add_fallback')) {
    return decodeURI(url.searchParams.get('add_fallback'));
  }
  return null;
}

async function init() {
  registerServiceWorker("./service-worker.js");
  const target = getLinkToAdd();
  if (target) {
    setPage('pending');

    const authenticatedPromise = setUpAuth();
    document.querySelector('#auth-button').addEventListener('click', () => {
      oauthClient.requestAccessToken();
    });
    await getGapi();
    await renderTargetPreview(target);
    setPage('auth_wait');

    await authenticatedPromise;
    setPage('pending');
    const sinkId = await getSinkPlaylist();
    await sendToYoutube(sinkId, target);
    setPage('done');
  } else {
    setPage('setup');
  }
}

init();