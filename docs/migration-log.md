# Migration Log

## 2025-11-02 — Environment Preparation
- New feature branch `dotnet` created to host the ASP.NET Core migration while keeping the Java application available for regression comparisons.
- Strategy confirmed: build the .NET 8 solution in-place within this repository (e.g., under `dotnet/`), reusing existing static assets and executables until parity is achieved. The legacy Spring Boot code stays untouched until the .NET stack is ready to cut over.
- Development container rebuilt on top of `mcr.microsoft.com/dotnet/sdk:8.0`, now preloading BellSoft JDK 8, Maven, and DISLIN so both stacks compile and the magnetism toolchain keeps working.
- Action items for this stage:
  - Stand up the initial .NET solution skeleton and wire it to shared assets referenced in `docs/frontend-porting.md` and `docs/backend-porting.md`.
  - Record each milestone in this log so future contributors can trace the migration timeline.

## 2025-11-03 — Solution Skeleton
- Created `dotnet/ASTRO.Net.sln` with `Astro.Web`, `Astro.Domain`, `Astro.Tools`, and `tests/Astro.Web.Tests` projects to mirror the planned architecture.
- Added `Directory.Build.props` and `global.json` to align SDK selection, nullable context, and analyzer enforcement across the new solution.
- Configured `Astro.Web` to host ASP.NET Core 8 with Blazor Server interactivity, controller support, and an 8080 default to match the Spring Boot port.
- Linked the existing `src/main/resources/static` assets into the ASP.NET `wwwroot` so the legacy WebGL resources publish with the new host.
- Scaffolded an ASP.NET Core `SiteController` mirroring the Spring routes, added placeholder Razor views, and wired temporary services for tide tables and magnetic PDFs pending full ports.
- Reimplemented the tide table integration with an AngleSharp-based HTML scraper (`HtmlTideTableService`) so WebGL pages can reuse the DHN maritime data via the .NET stack.
- Ported the DISLIN PDF generator to `CliMagneticPdfService`, invoking `/opt/declinacao-magnetica/gerar` with the same validation and cleanup logic used in the Java application.
- Recreated the legacy Thymeleaf front-end shell in Razor (`MainPage` and `TemplateWebGl`), wiring it to the original HTML fragments and static assets so the .NET host serves the existing WebGL experiences.
- Introduced a lightweight template resolver that expands Thymeleaf `th:replace`/`th:include` fragments so the WebGL pages render identically to the production site when served from ASP.NET Core.
- Documented follow-up action: add automated tests that diff the resolver output against HTML captured from https://daed.on.br/astro/ to guarantee future parity.
- Added an integration parity test (`TemplateParityTests`) that compares the `calendario-gregoriano` and `data-juliana` coordinate pages against production markup to catch regressions as the migration continues.

## 2025-11-03 — HTML Parity & Regression Harness
- Finalized the Razor wrapper (`TemplateWebGl.cshtml`) around the legacy Thymeleaf fragments by introducing an HtmlAgilityPack-based `TemplateResolver` that expands `th:include`/`th:replace` directives and inlines `[[${...}]]` expressions. The ASP.NET Core host now serves the exact HTML that production exposes.
- Updated `/magnetismo-terrestre` help content to embed the tutorial video over HTTPS while keeping the markup otherwise identical; the parity harness lists the YouTube URL as an allowed delta until production is updated.
- Expanded `TemplateParityTests` to cover every WebGL route published on the landing page plus the calendar tools. Each test fetches the relevant section from production and compares it to the .NET output, allowing per-route diff relaxations where intentional changes exist.
- All parity tests pass against https://daed.on.br/astro/, confirming the .NET port now returns 1:1 markup for the public pages. Documented the new test matrix and execution steps in `routes-and-contracts.md` and `build-and-ops.md`.

## 2025-11-03 — Jovian Satellites Ephemeris
- Initial .NET port replaced the Horizons batch CGI dependency with a deterministic `LocalJovianEphemerisService`. We have now superseded that approach with `HorizonsJovianEphemerisService`, which queries the official JPL Horizons service (through `IHorizonsClient`) and relays authoritative vectors for the Sun, Earth, and Galilean moons. Fixtures captured from Horizons provide offline unit-test verification.
- Added `HorizonsController` to expose `/horizons/jupiter-satellites-model` using the legacy JSON contract (`op = "CARTESIAN"`, position/velocity components in AU/AU-day, masses in Solar units).
- Documented the previous proxy strategy and the new offline implementation in `docs/jupiter-satellites.md`. Follow-up work includes tightening the orbital model (SPICE kernels) and extending the approach to the remaining Horizons endpoints.

## 2025-11-05 — Jovian UI Migration Kick-off
- Página original “Satélites de Júpiter” renomeada para `/old-satelites-jupiter` para preservar a experiência atual durante a migração.
- `/satelites-jupiter` passa a exibir uma nova interface “v2” que inicializa um Worker (`lib/on-daed-js/workers/satelites-jupiter-worker.js`), registra uma linha do tempo de progresso e mostra um preview em canvas com dados sintéticos.
- `docs/jupiter-satellites-refactor.md` atualizado com o mapeamento detalhado da implementação legada e os passos necessários para integrar o motor Stellarium Web SDK.

## 2025-11-04 — Solution Cleanup
- Removed the placeholder `Astro.Tools` console project from `ASTRO.Net.sln` after build failures revealed it never contained an entry point. The repository now builds (`dotnet build`) without extra steps. When we have concrete CLI utilities to ship, reintroduce them as a properly configured project with a `Main` method.
