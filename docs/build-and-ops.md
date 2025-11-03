# Build, Packaging, and Operations

Migrating to .NET 8 requires rethinking the build and runtime pipeline that currently relies on Maven and a Spring Boot fat WAR. This document outlines the replacements and highlights operational considerations.

## Solution Layout

```
ASTRO.Net.sln
 ├─ Astro.Web/          # ASP.NET Core 8 web host (Blazor Server + API)
 ├─ Astro.Domain/       # Optional class library for shared models/services
 ├─ Astro.Tools/        # Console utilities (orbit generator, data scrapers)
 └─ tests/              # xUnit or MSTest projects for regression coverage
```

## Build Toolchain

- Replace Maven with the .NET SDK (`dotnet build`, `dotnet publish`). Add a root `global.json` if you need to pin the SDK version.
- Configure `Directory.Build.props` to share common package references, nullable context, analyzers, and default namespaces across projects.
- Use `dotnet restore` in CI to fetch NuGet dependencies (AngleSharp, HtmlAgilityPack, Polly, etc.).

## Dependency Management

- Map Java dependencies to NuGet equivalents:
  - Spring MVC → `Microsoft.AspNetCore.App`
  - Apache HttpClient → built-in `System.Net.Http`
  - Commons Net (Telnet) → `PrimS.Telnet` or custom socket implementation
  - Gson → `System.Text.Json`
  - Jsoup → `AngleSharp` / `HtmlAgilityPack`
  - Apache Commons IO (`IOUtils`) → `System.IO` helpers
- Document any third-party libraries added to achieve parity, including license implications.

## Configuration Files

- Translate `application.properties` into `appsettings.json` (development/staging/production variants).
- Use `IOptions` for strongly typed configuration classes (e.g., endpoints, timeouts, path to DISLIN executable).
- Provide a mapping table in the README showing where each property moved.

## Containerization

- Base image: `mcr.microsoft.com/dotnet/aspnet:8.0` for runtime, `mcr.microsoft.com/dotnet/sdk:8.0` for builds.
- Build steps:
  1. Copy solution + `*.csproj`, run `dotnet restore`.
  2. Copy src, run `dotnet publish -c Release -o /app/out`.
  3. Copy `external-dependencies/declinacao-magnetica` and install DISLIN in the runtime image (mirror current Dockerfile logic).
  4. Expose port `8080` (matching the current Spring Boot default) or configure via environment variable to keep backwards compatibility.
- Update the dev container to install the .NET SDK and the same science dependencies.

### Development Container

- The `.devcontainer/Dockerfile.dev` now inherits from `mcr.microsoft.com/dotnet/sdk:8.0` and layers in BellSoft JDK 8, Maven, and the DISLIN 11.5 runtime so both the legacy Spring Boot app and the new ASP.NET Core project compile from the same environment.
- VS Code extensions include both the Java pack and `ms-dotnettools.csharp`. The `postCreateCommand` runs `dotnet --info`, `java -version`, and `mvn -version` to verify tool availability right after the container spins up.
- Keep this image in sync with the production Dockerfile additions (DISLIN install, `/opt/declinacao-magnetica` symlink) to avoid “works on devcontainer” drift.

## Continuous Integration

- Replace existing Maven commands with:
  ```bash
  dotnet restore
  dotnet build --configuration Release --no-restore
  dotnet test --configuration Release --no-build
  dotnet publish --configuration Release --no-build --output out
  ```
- Add linting via `dotnet format` or Roslyn analyzers.
- Integrate Playwright or Selenium tests to validate the Blazor-rendered pages against captured baselines from the Java app.

## Deployment

- Publish self-contained or framework-dependent builds depending on the target environment. Linux containers can run framework-dependent builds.
- Copy mandatory assets (`wwwroot`, DISLIN binaries, dataset JSONs) into the publish directory. Use `ItemGroup` entries with `CopyToOutputDirectory="Always"` for non-code files.
- Provide a systemd/Windows service configuration for hosting the ASP.NET app if deploying outside containers.

## Observability

- Replace any existing logging with `ILogger` and route logs to the platform’s preferred sink (Console, Journald, Application Insights, etc.).
- Add health checks (`app.MapHealthChecks("/health")`) to allow Kubernetes or other orchestrators to monitor the service.
- Instrument key endpoints (Horizons API, PDF generator) with metrics (e.g., Prometheus counters) if the platform supports it.

## Backward Compatibility Checklist

- Routes return identical status codes and payload shapes.
- Static file URLs, cache headers, and content types remain unchanged.
- External tools (DISLIN generator) invoked successfully inside new container/host.
- NASA Horizons integration verified with the same Julian day inputs.
- CSV download still produces `export.csv` with header/body content identical to Java version.

Following this plan ensures the .NET 8 build/deployment story is production-ready and faithful to the current operational model.
