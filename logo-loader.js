const LOGO_LOADER_SEEN_KEY = "svgp_logo_loader_shown_session";
const loaderEl = document.getElementById("svgp-logo-loader");
const barFillEl = document.getElementById("loader-bar-fill");
const statusTextEl = document.getElementById("loader-status-text");

let loaderTimer = null;

function hideLoaderInstantly() {
  clearInterval(loaderTimer);
  if (!loaderEl) return;
  loaderEl.style.transition = "none";
  loaderEl.classList.add("is-done");
}

function startLogoLoading() {
  if (!loaderEl) return;

  try {
    if (sessionStorage.getItem(LOGO_LOADER_SEEN_KEY) === "1") {
      hideLoaderInstantly();
      return;
    }
    sessionStorage.setItem(LOGO_LOADER_SEEN_KEY, "1");
  } catch (_) {}

  const durationMs = 3000; // 3 seconds smooth logo loading
  const start = Date.now();

  loaderTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));

    if (barFillEl) barFillEl.style.width = `${pct}%`;
    if (statusTextEl) statusTextEl.textContent = `Loading... ${pct}%`;

    if (elapsed >= durationMs) {
      clearInterval(loaderTimer);
      loaderEl.style.transition = "";
      loaderEl.classList.add("is-done");
      if (!history.state || history.state.loaderDone !== true) {
        history.replaceState({ loaderDone: true }, "", window.location.href);
      }
    }
  }, 60);
}

window.addEventListener("DOMContentLoaded", startLogoLoading);

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    hideLoaderInstantly();
    return;
  }
  try {
    if (sessionStorage.getItem(LOGO_LOADER_SEEN_KEY) === "1") {
      hideLoaderInstantly();
    }
  } catch (_) {}
});

window.addEventListener("popstate", () => {
  hideLoaderInstantly();
});