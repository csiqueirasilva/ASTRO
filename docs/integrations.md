# Integrations & External Dependencies

ASTRO relies on several binaries, datasets, and third-party services. This document describes how to keep those integrations working when moving to .NET 8, with special attention to components that must be reused as-is.

## DISLIN / Declinacao Magnetica Generator

- The Java service invokes `/opt/declinacao-magnetica/gerar` (bundled in `external-dependencies/declinacao-magnetica`) to produce PDFs using the DISLIN 11.5 runtime.
- In the .NET port:
  - Mount or install the same directory structure inside the container/host so the executable remains accessible at `/opt/declinacao-magnetica/gerar`.
  - Use `ProcessStartInfo` with `WorkingDirectory` pointing to a temp folder and set `EnvironmentVariables["LD_LIBRARY_PATH"] = "/usr/local/dislin"`.
  - Copy the generated `dislin.pdf` back into memory and stream it to the caller exactly as today.
  - Keep the existing validations on year (`1900 ≤ ano ≤ 2030`) and data type (`1/2/3`). Throw `ArgumentOutOfRangeException` for invalid input to match the current behaviour (`UnsupportedOperationException`).
- Any future Windows deployment must supply equivalent binaries (e.g., via WSL or container) because the CLI tool is Linux-specific.

## NASA JPL Horizons

- Two access modes exist:
  1. **HTTP batch API** handled by `HttpConnector`.
  2. **Telnet client** handled by `TelnetConnector` (fallback or legacy).
- Reimplement both paths so the .NET service can continue to fetch orbital data:
  - Use `IHttpClientFactory` with resilient policies (retry, timeout) for the HTTP endpoint `https://ssd.jpl.nasa.gov/horizons_batch.cgi`.
  - Maintain the same form parameters and regex parsing to build `HorizonsResultCollection`.
  - For Telnet, use `System.Net.Sockets.TcpClient` or a Telnet library to automate the interactive prompts. Treat it as optional fallback and feature-flag it if NASA eventually disables Telnet.
- Ensure all outbound requests set a descriptive `User-Agent` and respect NASA’s usage policies (rate limiting).

## Tide Tables (`HTMLHandling`)

- Pages scrape `http://www.mar.mil.br/dhn/chm/box-previsao-mare/tabuas/index.htm`. The .NET port must:
  - Fetch the same URL via `HttpClient` with a short timeout and fallback to cached data if unavailable.
  - Parse HTML using `AngleSharp`/`HtmlAgilityPack`, replicating the selection logic implemented with Jsoup.
  - Preserve the caching/sorting of `PortoData` and `TabuaMare`, including ordering by Portuguese names and year ranges.
- Consider adding local caching (memory or disk) to avoid re-scraping the site on every request.

## Orbit Generator Utility

- `Orbitas` is a standalone Java tool that converts data files in `orbitas/` to JSON. Port this tool to a .NET console app:
  - Inputs remain the same (text files with columns).
  - Outputs go into the same relative location so front-end scripts find them.
  - Keep `referencia.json` structure identical for compatibility.

## Vendored JS Libraries / Submodules

- The repo uses git submodules under `src/main/resources/static/lib/` (`on-daed-js`, `on-physics`, `jupiter-satellite-events-json`). In the .NET project:
  - Either keep them as Git submodules anchored at the same commit or copy the generated assets into `wwwroot/lib`.
  - Update documentation on how to sync submodules for future updates.
- Python helper `igrf-extractor.py` and JSON datasets (`igrf-v12.json` etc.) can remain unchanged; expose them from `wwwroot` or keep them in `App_Data` if they are server-only.

## Logging & Monitoring

- Replace `System.out.println` usage (e.g., the CLI helpers) with ASP.NET Core `ILogger`. Ensure sensitive data (API keys, personal info) is redacted if logging request contents.
- Integrate structured logging sinks (Console, Seq, Application Insights) per environment.

## Configuration Management

- Values currently stored in `application.properties` (ports, logging) move to `appsettings.json` and environment variables. Provide a migration table for every property.
- Sensitive configuration such as API tokens should be injected through `IConfiguration` or secret stores.

## Container & Environment Setup

- The Dev Container installs DISLIN and configures symlinks. Mirror this in a new `.devcontainer` and Dockerfile based on the .NET 8 SDK image:
  - Install DISLIN and copy `external-dependencies/declinacao-magnetica/dislin-11.5.linux.i586_64.deb`.
  - Run `dotnet restore` instead of `mvn dependency:go-offline`.
  - Keep the `/opt/declinacao-magnetica` symlink creation step.
- Document any additional OS packages required by `HttpClient` (e.g., CA certificates) or by the JS build pipeline.

By addressing each integration explicitly we ensure the .NET port can rely on the same scientific tooling and data pipelines without service regressions.
