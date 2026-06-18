# GitHub Copilot Custom Instructions

## Context

This project follows a structured and modular development approach with a focus on:

- **Separation of concerns**: Keeping business logic, presentation, and data access distinct.
- **Performance optimization**: Writing efficient and scalable code.
- **Code reusability**: Encouraging modular, **KISS (Keep It Simple, Stupid)** and **DRY (Don't Repeat Yourself)** principles.
- **Security best practices**: Avoiding vulnerabilities in authentication, authorization, and data handling.
- **CMS-Migration**: WordPress wird schrittweise durch ein modernes, auf Markdown und Astro basierendes System ersetzt.
- **Event-Archiv**: Konzert-, Festival- und Lesungsseiten werden als strukturierte MDX-Dateien unter `src/content/docs/events/YYYY/YYYY-MM-DD.mdx` gepflegt.

---

## Event Content & SEO

- Event-MDX-Dateien müssen das zentrale Frontmatter-Schema nutzen: `title`, `description`, `tour`, `artist`, `category`, `ticketCategory`, `support`, `status`, `pubDate`, `country`, `city`, `venue`, `price`, `asin`, `ogImage`, `canonicalUrl`, `tags`.
- Verwende `TBA` für noch unbekannte Inhalte. Erfinde keine Setlists, Supports, Kategorien oder Preise.
- `category` ist einer von `Konzert`, `Festival`, `Lesung` oder `TBA`.
- `status` ist einer von `scheduled`, `postponed`, `cancelled`, `completed` oder `TBA`.
- Gallery-Bilder bleiben in `src/content/gallery/YYYY/MM/DD/` und werden in MDX über Astro-Imports und die `Gallery`-Komponente eingebunden.
- Öffentliche Open-Graph-Bilder liegen separat unter `public/og/events/YYYY/YYYY-MM-DD.jpg`.
- `ogImage` soll auf diesen öffentlichen Pfad zeigen, z.B. `/og/events/2027/2027-12-11.jpg`.
- `canonicalUrl` folgt dem Muster `/events/YYYY/YYYY-MM-DD/`.
- `src/components/EventSeo.astro` rendert JSON-LD aus dem Frontmatter. Änderungen am Frontmatter-Schema müssen mit dieser Komponente und `src/content.config.ts` konsistent bleiben.
- Neue Event-MDX-Dateien sollen über den zentralen Renderer `src/scripts/event/render.mjs` erzeugt oder an dessen Ausgabeformat angelehnt werden.
- Das OG-Bild wird über `npm run event:og -- YYYY-MM-DD` erzeugt oder automatisch durch `npm run event:mdx -- YYYY-MM-DD`.

## Artist Content

- Artist-Profile liegen unter `src/content/docs/artists/<slug>.mdx`.
- Artist-Slugs sind stabil und deutsch lesbar, z.B. `die-aerzte`, `herbert-groenemeyer`, `guenter-schulz`.
- Das minimale Artist-Frontmatter nutzt `title`, `description`, `artistName`, `artistType`, `aliases`, `origin`, `country`, `artistStatus`, `website`, `musicbrainzId`, `wikidataId`, `canonicalUrl`, `tags`.
- Unbekannte Artist-Informationen werden mit `TBA` gepflegt, nicht geraten.
- Fehlende Artist-Profile werden mit `npm run artist:sync` aus `artist`, `support` und `guest` der Event-MDX-Dateien erzeugt.
- Manuell gepflegte Artist-Seiten sollen nicht durch Skripte überschrieben werden.
- Artist-Menüs, Support-Links in `EventFacts` und Statistikseiten bauen später auf `src/content/docs/artists` auf, sind aber getrennte Ausbaustufen.

## Code Style and Formatting

- Use **camelCase** for variables and functions.
- Use **PascalCase** for class names.
- Use **snake_case** for file and database table names.
- Follow **Prettier** for JavaScript and **YAML linting** for configuration files.
- Ensure **HTML5 and CSS3** compliance for web-related code.
- Prefer **ES6+ syntax** for JavaScript.

---

## Documentation & Comments

- Use **Markdown (.mdx)** for documentation with **MDX support** for interactive content.
- Maintain **structured YAML (.yaml) files** for configuration and data handling.
- Provide inline comments for complex logic.
- Schreibe **klare und aussagekräftige Commit-Nachrichten auf Deutsch** im folgenden Format:

  ```plaintext
  feat: Kurze Beschreibung der Funktion
  fix: Kurze Beschreibung der Fehlerbehebung
  refactor: Kurze Beschreibung der Refaktorierung
  ```

## Code Review Guidelines

- Ensure **no console logs** in production code.
- Use **meaningful variable and function names**.
- Avoid **hardcoded values**, use environment variables where needed.
- Follow the **MVC (Model-View-Controller) architecture** for structured code organization.
- Ensure **test coverage** for critical functionalities.
- Code-Reviews und Pull-Request-Beschreibungen sollen ebenfalls **auf Deutsch** verfasst werden.

## Git Workflow

- **Hinweis zur Namenskonvention:** In diesem Projekt sollen Branch-Namen und Pull Requests konsistent benannt werden.
- Use **feature branches** (e.g., `feature/add-user-auth`).
- Branch-Namen dürfen englisch bleiben, aber **Pull-Request-Titel und Beschreibungen sollen auf Deutsch formuliert sein.**
- Follow **Pull Request (PR) templates** and request reviews before merging.
- Use **semantic versioning** (e.g., `v1.2.3`).
- Commit-Nachrichten und Pull Requests müssen **auf Deutsch** formuliert sein.

## AI-Assisted Suggestions

- Prefer **functionally correct** over purely optimized solutions.
- Suggest **secure** and **best-practice** implementations.
- Prioritize **readability and maintainability**.
- Assist in **debugging and error handling improvements**.

## Dependencies & Tools

- Framework: **Astro** (with .mdx file support)
- CMS: **Markdown-basiertes statisches Site-Setup (ersetzt WordPress)**
- Backend: **Node.js (Express / Astro SSR)**
- Frontend: **React / CSS**
- Database: **PostgreSQL / MySQL**
- CI/CD: **GitHub Actions**
- Testing: **Playwright**
- API Documentation: **Swagger / OpenAPI**

---
