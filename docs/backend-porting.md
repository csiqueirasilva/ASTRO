# Backend Porting Guide

This guide breaks down every Java backend component and explains how it should be reimplemented in ASP.NET Core 8.0 while keeping the existing HTTP contract intact.

## Project Structure Mapping

| Current Package | Responsibility | .NET Counterpart |
| --- | --- | --- |
| `br.on.daed.services.initializers.*` | Bootstraps Spring Boot embedded Tomcat, shows Swing launchers | `Program.cs` with top-level `WebApplication`, optional WinUI/WPF launcher |
| `br.on.daed.services.configurations` | MVC setup, Jackson configuration | `Startup`-style builder configuration in `Program.cs` |
| `br.on.daed.services.filters` | Servlet filters for cache and CORS | ASP.NET Core middleware |
| `br.on.daed.services.controllers` | HTTP endpoints for views, CSV export, Horizons API | `Controllers` folder with MVC controllers returning views/JSON/FileResult |
| `br.on.daed.services.horizons` | NASA Horizons integration | Injected services using `HttpClient`/sockets |
| `br.on.daed.services.html.*` | HTML scraping for tides, orbit JSON generation utilities | .NET services using `HttpClient` and HTML parsing libraries |
| `br.on.daed.services.pdf` | DISLIN CLI orchestration for magnetism PDF | .NET service invoking the existing binary via `System.Diagnostics.Process` |
| `br.on.daed.services.process` | Process logging helper | Shared utility class |
| `br.on.daed.embed.browser` / `br.on.daed.services.gfx` | JavaFX / Swing desktop entry points | Optional .NET desktop host (WPF/WinUI) or CLI bootstrapper |

## Hosting & Application Startup

- Replace `SpringBootApplicationInitializer` / `WebMvcApplicationInitializer` with the default ASP.NET Core 8 hosting model:
  ```csharp
  var builder = WebApplication.CreateBuilder(args);
  // configure services here
  var app = builder.Build();
  // configure middleware & endpoints
  app.Run();
  ```
- Register all services in DI (`builder.Services.AddSingleton<>()` / `AddScoped<>()`) mirroring Spring’s component scanning. Every `@Service` becomes a DI-registered class.
- If the desktop launcher is still required, create a separate project (e.g., WPF) that starts the ASP.NET host using `Host.CreateDefaultBuilder` and opens the browser once the port is known (see `TelaPrincipal` notes below).

## MVC Configuration & Serialization

- `WebMvcConfig` currently tweaks Jackson to ignore nulls. Configure `System.Text.Json` accordingly:
  ```csharp
  builder.Services.AddControllersWithViews()
      .AddJsonOptions(o => o.JsonSerializerOptions.DefaultIgnoreCondition =
          JsonIgnoreCondition.WhenWritingNull);
  ```
- Resource handlers in Spring map static files; in ASP.NET Core we rely on the built-in static files middleware with `app.UseStaticFiles()` and `app.UseDefaultFiles()`. Place the existing static assets into `wwwroot` preserving paths (`wwwroot/lib/...` etc.).

## Filters → Middleware

- `CacheControlFilter` becomes middleware added early in the pipeline:
  ```csharp
  app.Use(async (context, next) =>
  {
      context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0";
      context.Response.Headers.Add("Expires", "Tue, 03 Jul 2001 06:00:00 GMT");
      context.Response.GetTypedHeaders().LastModified = DateTimeOffset.UtcNow;
      context.Response.Headers.Pragma = "no-cache";
      await next();
  });
  ```
- `AllowCrossDomainAjax` only affects `/astro/**` routes. Use `AddCors` + `UseCors` with a named policy that mirrors the wildcard headers currently set, and apply it to the matching endpoints.

## Controllers

### `SiteController`
- Each `@RequestMapping` is now handled by the ASP.NET MVC controller at `Astro.Web/Controllers/SiteController.cs`. The port keeps the same method layout as the legacy class so diffs remain manageable.
- The controller delegates HTML rendering to `TemplateResolver`, which reads the original Thymeleaf templates, expands `th:include` / `th:replace`, and returns the resulting markup. `TemplateWebGl.cshtml` then writes the fragments via `@Html.Raw`, ensuring the generated HTML matches production byte-for-byte.
- When adding a new route, call `WebGl("<slug>")` (which sets the fragment keys in `ViewData`), confirm the slug exists under `templates/webgl/`, and add the route to the parity harness (`TemplateParityTests`).
- Non-WebGL pages such as `mainpage.html` are served by resolving the full template (`_resolver.Resolve("mainpage.html")`) and returning it with `Content(html, "text/html; charset=utf-8")`. No Razor/Blazor rewrite is required until we explicitly choose to modernise a page.

### `ToolsController`
- Converts to an MVC controller with a `[HttpPost("/csv")]` action returning `FileContentResult`.
- Map headers/body assemble logic exactly as the Java implementation; ensure the response headers (`Content-Disposition`, `text/csv`) match to avoid breaking downloads.

### `HorizonsController`
- Add an API controller (`[ApiController]`, `[Route("horizons")]`) returning strongly typed DTOs serialized with `System.Text.Json`.
- Inject the ported `HorizonsInterface` via constructor injection.
- Maintain the same query string parameter names (`jd`, `id`) so the existing front-end fetches continue to work.
- `@CrossOrigin` is replaced by the CORS policy configured earlier.

## Horizons Services

### `HorizonsInterface`
- Convert to a `class HorizonsInterface` registered as `Scoped`.
- Static helper methods (`kgToSunMass`, `kmToAU`, etc.) become either `static` methods or, preferably, extension methods on a separate utility class to make unit testing easier.
- The collection and object types (`HorizonsResultCollection`, `HorizonsResult`, `CartesianCoordinates`, `OrbitalElements`) become C# records/classes with matching JSON property names so the serialized output stays identical.

### `HttpConnector`
- Replace Apache HttpClient with the built-in `HttpClient` obtained from an injected `IHttpClientFactory`. Configure a named client targeting `https://ssd.jpl.nasa.gov`.
- Implement the POST in .NET using `FormUrlEncodedContent`; parse the multi-line Horizons response with `Regex` equivalents (`System.Text.RegularExpressions`).
- The regex patterns can be copied as-is; test them against captured Horizons responses to ensure no culture/locale issues.
- `kmSecToAUDay`, `gmToMass`, and other conversion helpers should use `double` and `Math` with `InvariantCulture` to avoid comma decimal separators.

### `TelnetConnector`
- If Telnet fallback is still needed, use `System.Net.Sockets.TcpClient` or a third-party Telnet library. Recreate the connection handling, command sequencing, and regex extraction logic.
- Because Telnet access may be unstable, wrap the connector behind an interface that the controller can swap for the HTTP connector when the batch API fails.

### DTOs in `br.on.daed.services.horizons.objects`
- Port each POJO (`HorizonsResult`, `HorizonsResultCollection`, `CartesianCoordinates`, `OrbitalElements`) to immutable records with the same property casing. Ensure `JsonProperty`/`JsonInclude` equivalents keep null suppression.
- Reimplement collection logic (`List<EntradaTabua>`, etc.) using `List<T>` in .NET.

## HTML Scraping & Domain Helpers

### `HTMLHandling`
- Replace Jsoup usage with `AngleSharp` or `HtmlAgilityPack`. Use `HttpClient` (with timeout) to fetch remote HTML, then parse the DOM to derive tide information.
- `getMareYear()` and `getMareOptions()` return primitives/DTOs; convert to synchronous/asynchronous methods returning `Task<int>` / `Task<IEnumerable<PortoData>>`.
- Where the Java code concatenates strings, switch to `StringBuilder` or C# string interpolation.

### `br.on.daed.services.html.portos.*`
- Port DTOs (`PortoData`, `EntradaTabua`, `TabuaMare`) to records/classes.
- Replace the `LinkedHashMap` usage with `OrderedDictionary` or simply `List<KeyValuePair<string,string>>` to preserve order when serializing for the front end.
- Ensure the JSON shape produced by the Java endpoints remains unchanged; enforce deterministic ordering by serializing with `Dictionary<string,string>` and `JsonSerializerOptions.WriteIndented = false`.

### `Orbitas`
- Recreate the offline data processing script as a .NET console tool (separate project) responsible for generating `.json` files identical to the current output. Use `System.Text.Json` for serialization.
- Reimplement regex parsing using `Regex` with compiled options for performance.
- Ensure file naming and content structure match to avoid reworking downstream JS loaders.

## PDF Generation & External CLI

### `DadosMagneticos`
- Use `ProcessStartInfo` to invoke `/opt/declinacao-magnetica/gerar` with the same arguments (`ano`, `tipo`). Respect the directive to reuse the existing executable.
- Set `EnvironmentVariables["LD_LIBRARY_PATH"]` just like the Java code. On Windows targets, document the need for WSL or containerization since DISLIN binaries are Linux-specific.
- After the process finishes, read `dislin.pdf` with `File.ReadAllBytes`, stream it through `FileContentResult`, and delete temporary directories with `Directory.Delete(path, recursive: true)`.
- The validation logic for `ano`/`tipo` translates directly; raise `ArgumentOutOfRangeException` as the .NET equivalent of `UnsupportedOperationException`.

### `ProcessHelper`
- Convert to a logging helper that writes stdout/stderr to `ILogger`. Example:
  ```csharp
  public static async Task PipeProcessOutputAsync(Process process, ILogger logger)
  {
      // read asynchronously and log each line
  }
  ```

## Desktop Launchers

- `TelaPrincipal` and `ServerRunningDialog` are Swing/JDialog wrappers around the embedded server. Decide whether the .NET port still needs a desktop facade:
  - **Option A**: Provide a simple console message instructing the user to browse to `http://localhost:{port}`.
  - **Option B**: Rebuild the launcher as a WPF/WinUI app that starts the ASP.NET host and opens `Process.Start("cmd", "start …")` to launch the system browser.
- `DesktopBrowser` (JavaFX) can be replaced by WebView2 if an embedded browser remains a requirement.

## Dependency Injection & Lifetime Notes

- Register services with appropriate lifetimes:
  - `HorizonsInterface`, `HttpConnector`, HTML parsing utilities: `Scoped`.
  - Configuration/option providers: `Singleton`.
  - Process/CLI helpers: `Transient`.
- Use `IOptions<>` for configuration values that were previously read from `application.properties`.

## Error Handling & Logging

- Replace silent `catch (Exception e) {}` blocks with structured logging via `ILogger<T>`. Map business logic errors to `ProblemDetails` or HTTP status codes identical to the Java behaviour (e.g., returning `null` currently serializes to empty responses; decide whether to keep or return `404`/`400` and document it).

Following this plan ensures every server-side Java class has a direct .NET analogue while satisfying the directives to maintain routes, reuse external executables, and leave JavaScript untouched.
