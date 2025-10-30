/**
 * Verkefni 9 – Listaverkaleit
 * Vefforritun 1 (2025)
 * Leita í AIC API, sýna niðurstöður og stakt verk. Slow/Error togglar eru í forminu.
 */

import { el, empty } from "./lib/elements.js";
import { sleep, error as throwError } from "./lib/helpers.js";

const API = "https://api.artic.edu/api/v1";
const root = document.querySelector(".art-searcher");

/**
 * IIIF slóð fyrir mynd. Skilar null ef ekkert image_id.
 * @param {string|null|undefined} imageId
 * @param {number} [w=600]
 * @returns {string|null}
 */
function iiif(imageId, w = 600) {
  if (!imageId) return null;
  return `https://www.artic.edu/iiif/2/${imageId}/full/${w},/0/default.jpg`;
}

/**
 * Sækir JSON og kastar ef svar er ekki 2xx.
 * @template T
 * @param {string} url
 * @returns {Promise<T>}
 */
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * renderar  leit: form + niðurstöður.
 * @param {string} [initialQ=""]
 */
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

/**
 * renderar stakt verk úr artworks/{id}.
 * @param {string} id
 * @param {string} [q=""]
 */
async function renderArtwork(id, q = "") {
  empty(root);
  root.append(el("p", {}, "Sæki verk..."));

  try {
    const fields = [
      "id",
      "title",
      "artist_title",
      "date_display",
      "image_id",
      "medium_display",
      "dimensions",
      "credit_line",
      "department_title",
    ].join(",");

    const url = `${API}/artworks/${encodeURIComponent(id)}?fields=${fields}`;
    const data = await getJSON(url);
    const art = data?.data;

    empty(root);

    if (!art) {
      root.append(el("p", { class: "error" }, "Ekkert verk fannst."));
      return;
    }

    const backHref = q ? `?q=${encodeURIComponent(q)}` : `?`;
    const img = iiif(art.image_id, 800);

    root.append(
      el("p", {}, el("a", { href: backHref }, "← Til baka í leit")),
      el("h2", {}, art.title ?? "(án titils)"),
      el(
        "p",
        {},
        [art.artist_title ?? "Óþekktur höfundur", art.date_display ? ` • ${art.date_display}` : ""].join(""),
      ),
      img
        ? el("img", { src: img, alt: art.title ?? "" })
        : el("div", { class: "img-placeholder large" }, "Engin mynd"),
      art.medium_display ? el("p", {}, art.medium_display) : null,
      art.dimensions ? el("p", {}, art.dimensions) : null,
      art.department_title ? el("p", {}, `Deild: ${art.department_title}`) : null,
      art.credit_line ? el("p", {}, `Uppruni: ${art.credit_line}`) : null,
    );
  } catch (err2) {
    empty(root);
    root.append(el("p", { class: "error" }, `Villa við að sækja verk: ${(/** @type {Error} */ err2).message}`));
  }
}

/**
 * startar appi: ef id er í URL er  verk synt, annars leitað.
 */
function boot() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const q = params.get("q") ?? "";

  if (id) {
    void renderArtwork(id, q);
  } else {
    renderSearch(q);
  }
}

boot();
