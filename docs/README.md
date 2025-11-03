# ASTRO .NET 8 Porting Notes

This folder captures how we are migrating the current Spring Boot 1.3 / Java 8 application to .NET 8 while preserving behaviour and routes. Start with `overview.md` for the migration narrative, then dive into the subsystem guides:

- `overview.md` – guiding principles, sequencing, and cross-cutting concerns.
- `backend-porting.md` – how each Java backend component maps to ASP.NET Core constructs and how the `TemplateResolver` serves the original HTML.
- `frontend-porting.md` – maintaining the legacy templates via the resolver, managing fragments, and running the parity harness.
- `jupiter-satellites.md` – historical Horizons proxy notes and the new local ephemeris used by `/horizons/jupiter-satellites-model`.
- `integrations.md` – handling DISLIN, magnetism utilities, Horizons API, and other external dependencies.
- `build-and-ops.md` – replacing Maven and container tooling with the .NET build/deployment pipeline and running the regression suite in CI.
