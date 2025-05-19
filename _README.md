# 🎪 Mysteryland

**Multiplattform-Contentquelle für Event-Berichte, Setlists und Fotogalerien**  
Erstellt mit **Markdown**, gepflegt in **Visual Studio Code**, versioniert über **GitHub** – publiziert auf **[fanieng.com](https://fanieng.com)** (WordPress) und **[mysteryland.biz](https://mysteryland.biz)** (Astro-Framework).

---

## 📂 Projektstruktur

```plaintext
src/
├── content/                 # Markdown-Inhalte (Berichte, Setlists)
│   └── events/
│       └── 2025/
│           └── 05-17/
│               └── index.mdx
├── gallery/                 # Event-Fotos, geordnet nach Jahr und Datum
│   └── 2025/
│       └── 05-17/
│           └── 2025-05-17_20-00-00.jpg
└── pages/                   # Astro-Seiten (Startseite, Navigation, etc.)
    ├── index.astro           # Startseite
    └── events.astro        # Event-Übersicht
```

## 📜 Markdown-Inhalte

### Event-Berichte

- **Dateiname**: `index.mdx`
- **Pfad**: `src/content/events/JJJJ/MM-DD/`
- **Inhalt**: Markdown-Format mit YAML-Frontmatter

---
