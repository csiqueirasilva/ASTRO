# Migration Overview

The ASTRO application will move from a legacy Spring Boot 1.3 (Java 8) stack to ASP.NET Core 8.0 while preserving public routes, JavaScript assets, and existing science tooling. The migration is a rewrite, not an automated translation, so we will deliver it in stages that keep the current Java service running until the .NET build reaches feature parity.

## Goals and Non-Goals
- **Keep the external contract stable**: HTTP routes, request/response payloads, and static asset locations remain unchanged so the front-end and integrations continue to work.
- **Reuse science executables**: Existing CLI tools (e.g., the DISLIN-based generator at `/opt/declinacao-magnetica/gerar`) stay in place and are invoked from .NET instead of Java.
- **Modernize the host**: Adopt ASP.NET Core 8 with minimal hosting and dependency injection to replace the custom Spring servlet setup.
- **Replace Thymeleaf with Blazor**: Views that currently use Thymeleaf fall back to Blazor Server pages/components; static WebGL/JS continues untouched.
- **Retain submodule output**: JavaScript libraries pulled via git submodules or vendored assets are copied as-is into the new `wwwroot`.

Out of scope for the first pass: feature expansion, UX redesign, and conversion of Java-only desktop helpers (e.g., Swing screens) to full GUI parity; see `backend-porting.md` for mitigation notes.

## Migration Phases
1. **Inventory & parity tests** – Document every controller, filter, service, and static asset, and add regression checks around critical routes (CSV export, Horizons data, magnetism PDF).
2. **Platform foundation** – Scaffold the ASP.NET Core 8 solution, configure DI, logging, configuration providers, and static file hosting matching the current URL structure.
3. **Feature-by-feature port** – Rebuild controllers/services in .NET following the mappings in the subsystem guides while pointing shared executables and external web calls to the same endpoints.
4. **View conversion** – Translate each Thymeleaf template into a Blazor page or component, wiring models and partials to match existing HTML output.
5. **Ops handover** – Replace Maven/container scripts with `dotnet` tooling and update deployment pipelines, as detailed in `build-and-ops.md`.

Each completed feature should ship behind environment toggles so we can shadow traffic and compare outputs before decommissioning the Java service.
