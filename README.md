# IRPG Companion

Installable PWA companion to the NWCG Incident Response Pocket Guide (PMS 461).
All 93 sections of the January 2025 IRPG (text verbatim, plus page images for diagrams), search, home button, and Favorites (stored on-device).

Run locally: `python3 -m http.server` and open http://localhost:8000.
Host on any static HTTPS host (GitHub Pages works). On iPhone: Share > Add to Home Screen.

Regenerate content: `python3 tools/build_data.py IRPG.pdf` (needs poppler-utils). Source: NWCG IRPG PMS 461, public domain.
