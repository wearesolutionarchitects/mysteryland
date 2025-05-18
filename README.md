# 🎪 Mysteryland

**Multiplattform-Contentquelle für Konzertberichte, Setlists und Fotogalerien**  
Erstellt mit **Markdown**, gepflegt in **Visual Studio Code**, versioniert über **GitHub** – publiziert auf **[fanieng.com](https://fanieng.com)** (WordPress) und **[mysteryland.biz](https://mysteryland.biz)** (Astro-Framework).

---

## 📂 Projektstruktur

```plaintext
src/
├── content/                 # Markdown-Inhalte (Berichte, Setlists)
│   └── concerts/
│       └── 2025/
│           └── 05-17-bochum-frankie/
│               └── index.md
├── gallery/                 # Konzertfotos, geordnet nach Jahr und Datum
│   └── 2025/
│       └── 05-17/
│           └── 2025-05-17 20-00-00.jpg
└── pages/                   # Astro-Seiten (Startseite, Navigation, etc.)
    ├── index.astro           # Startseite
    └── concerts.astro        # Konzertübersicht
```

## 📜 Markdown-Inhalte

### Konzertberichte

- **Dateiname**: `YYYY-MM-DD-stadt-band/index.md`

---