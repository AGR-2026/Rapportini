/**
 * SERVICE WORKER dei moduli rapportini (vendemmia e trasporti).
 *
 * Serve a una cosa sola: far APRIRE le pagine anche senza rete.
 * I dati compilati NON passano di qui — quelli li gestisce la coda dentro la
 * pagina (memoria del telefono), che riprova da sola quando torna il segnale.
 *
 * Regola: prima si prova la rete (così chi ha campo vede sempre l'ultima
 * versione appena caricata su GitHub), e solo se la rete manca si usa la copia
 * salvata sul telefono.
 *
 * Va caricato nella RADICE del repository, accanto a vendemmia.html e
 * trasporti.html: https://agr-2026.github.io/Rapportini/sw.js
 */

// Cambiando questo numero si obbliga il telefono a rifare la copia locale.
var CACHE = 'rapportini-v1';

var DA_SALVARE = [
  'vendemmia.html',
  'trasporti.html',
  'manifest-vendemmia.json',
  'manifest-trasporti.json',
  'icona-vendemmia.png',
  'icona-trasporti.png'
];

self.addEventListener('install', function (ev) {
  // addAll fallirebbe tutto insieme se un file manca: salvo uno per uno.
  ev.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(DA_SALVARE.map(function (f) {
        return c.add(f).catch(function () { /* pazienza, si salva al primo uso */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomi) {
      return Promise.all(nomi.map(function (n) {
        return n === CACHE ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;                    // gli invii non si toccano

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // Google Apps Script: mai dalla cache

  ev.respondWith(
    fetch(req)
      .then(function (risposta) {
        if (risposta && risposta.ok) {
          var copia = risposta.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return risposta;
      })
      .catch(function () {
        return caches.match(req).then(function (salvata) {
          if (salvata) return salvata;
          return caches.match('vendemmia.html');       // ultima spiaggia
        });
      })
  );
});
