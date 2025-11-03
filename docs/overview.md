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
1. **Inventory & parity tests** – ✅ Completed. Every route and asset has been catalogued, and `TemplateParityTests` now diff the rendered HTML for each public page against production output (see `routes-and-contracts.md` for selectors and allow-list rules).
2. **Platform foundation** – ✅ Completed. The ASP.NET Core 8 solution hosts controllers, static assets, and shared services while reusing the legacy WebGL directories.
3. **Feature-by-feature port** – In progress. Remaining work focuses on API integrations (Horizons, CSV endpoints) and ensuring the DISLIN toolchain runs through the .NET services.
4. **View rendering** – ✅ Initial pass finished. Instead of rewriting templates to Blazor, the new `TemplateResolver` expands the original Thymeleaf fragments at runtime so markup stays byte-for-byte equivalent. Future iterations can migrate individual pages to Razor/Blazor if needed, using the parity suite as a guardrail.
5. **Ops handover** – Pending. CI/CD and container changes are outlined in `build-and-ops.md`; implementation follows once backend parity is locked in.

Each completed feature should ship behind environment toggles so we can shadow traffic and compare outputs before decommissioning the Java service.
