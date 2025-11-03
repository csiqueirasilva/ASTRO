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
