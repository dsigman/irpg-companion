# IRPG Companion

Installable PWA companion to the NWCG Incident Response Pocket Guide (PMS 461).
Procedure list, per-procedure pages, home button, and a Favorites list (stored on-device).

Run locally: `python3 -m http.server` and open http://localhost:8000.
Host on any static HTTPS host (GitHub Pages works). On iPhone: Share > Add to Home Screen.

Content lives in `data.js`. Fill each procedure's `steps` (and `page`) verbatim from the current IRPG.
