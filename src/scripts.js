/* eslint no-console: 0 */

import { el, empty } from "./lib/elements.js";
import { sleep, error as throwError } from "./lib/helpers.js";

const API = "https://api.artic.edu/api/v1";
const root = document.querySelector(".art-searcher");

// IIIF slóð fyrir smámyndir
function iiif(imageId, w = 300) {
  if (!imageId) return null;
  return `https://www.artic.edu/iiif/2/${imageId}/full/${w},/0/default.jpg`;
}

// fetch sem kastar á non-2xx
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// aðal leitarskjár
function renderSearch(initialQ = "") {
  empty(root);

  const results = el("div", { class: "results" });

  const form = el(
    "form",
    {
      submit: async (e) => {
        e.preventDefault();

        const q = /** @type {HTMLInputElement} */ (form.querySelector('input[name="q"]')).value.trim();
        const slow = /** @type {HTMLInputElement} */ (form.querySelector('input[name="slow"]')).checked;
        const err = /** @type {HTMLInputElement} */ (form.querySelector('input[name="error"]')).checked;

        empty(results);
        results.append(el("p", {}, "Leita..."));

        try {
          if (slow) await sleep(2);
          if (err) throwError("hermuð villa");

          const url =
            `${API}/artworks/search` +
            `?q=${encodeURIComponent(q)}` +
            `&limit=20&fields=id,title,artist_title,date_display,image_id`;

          const data = await getJSON(url);
          const items = Array.isArray(data?.data) ? data.data : [];

          empty(results);

          if (items.length === 0) {
            results.append(el("p", {}, `Engar niðurstöður fyrir „${q}“.`));
            return;
          }

          const list = el("ul", { class: "art-list" });

          for (const it of items) {
            const img = iiif(it.image_id, 200);
            const href = `?id=${encodeURIComponent(String(it.id))}&q=${encodeURIComponent(q)}`;

            list.append(
              el(
                "li",
                {},
                img
                  ? el("img", { src: img, alt: it.title ?? "" })
                  : el("div", { class: "img-placeholder" }, "—"),
                el(
                  "div",
                  { class: "meta" },
                  el("h3", {}, el("a", { href }, it.title || "(án titils)")),
                  el(
                    "p",
                    {},
                    [it.artist_title ?? "Óþekktur höfundur", it.date_display ? ` • ${it.date_display}` : ""].join(""),
                  ),
                ),
              ),
            );
          }

          results.append(list);
        } catch (err2) {
          empty(results);
          results.append(el("p", { class: "error" }, `Villa í leit: ${(/** @type {Error} */ err2).message}`));
        }
      },
    },
    el("label", {}, "Leitarorð"),
    el("input", {
      type: "search",
      name: "q",
      placeholder: "t.d. Monet",
      value: initialQ,
      required: "required",
    }),
    el(
      "div",
      { class: "toggles" },
      el("label", {}, el("input", { type: "checkbox", name: "slow" }), " Hægja á kallinu"),
      el("label", { style: "margin-left:1rem" }, el("input", { type: "checkbox", name: "error" }), " Herma eftir villu"),
    ),
    el("button", { type: "submit" }, "Leita"),
  );

  root.append(form, results);
}

// ræsir bara leit (detail kemur í commit 2)
function boot() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const q = params.get("q") ?? "";

  if (!id) {
    renderSearch(q);
  } else {
    empty(root);
    root.append(el("p", {}, "Veldu verk úr leit til að skoða nánar."));
  }
}

boot();
