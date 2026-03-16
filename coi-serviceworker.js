/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (ev.data && ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => {
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }

    const request =
      coepCredentialless && r.mode === "no-cors"
        ? new Request(r, {
            credentials: "omit",
          })
        : r;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set(
            "Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp"
          );
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedByCOI = window.sessionStorage.getItem("coiReloadedByCOI");
    window.sessionStorage.removeItem("coiReloadedByCOI");

    const coiServiceWorker = {
      shouldRegister: () => !reloadedByCOI,
      shouldDeregister: () => false,
      coepCredentialless: () => true,
      coepDegrade: () => true,
      doReload: () => window.location.reload(),
      quiet: false,
    };

    const coi = coiServiceWorker;

    if (navigator.serviceWorker && coi.shouldRegister()) {
      navigator.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
          !coi.quiet &&
            console.log(
              "COOP/COEP Service Worker registered",
              registration.scope
            );

          registration.addEventListener("updatefound", () => {
            !coi.quiet &&
              console.log(
                "Reloading page to make use of updated COOP/COEP Service Worker."
              );

            window.sessionStorage.setItem("coiReloadedByCOI", "true");
            coi.doReload();
          });

          if (registration.active && !navigator.serviceWorker.controller) {
            !coi.quiet &&
              console.log(
                "Reloading page to make use of COOP/COEP Service Worker."
              );

            window.sessionStorage.setItem("coiReloadedByCOI", "true");
            coi.doReload();
          }
        },
        (err) => {
          !coi.quiet &&
            console.error(
              "COOP/COEP Service Worker failed to register:",
              err
            );
        }
      );
    }

    if (coi.shouldDeregister()) {
      navigator.serviceWorker &&
        navigator.serviceWorker.controller &&
        navigator.serviceWorker.controller.postMessage({
          type: "deregister",
        });
    }

    if (
      window.crossOriginIsolated === false &&
      coi.coepDegrade() &&
      !(reloadedByCOI && window.crossOriginIsolated)
    ) {
      !coi.quiet && console.log("Downgrading to COEP credentialless.");
      coepCredentialless = true;
    }
  })();
}
