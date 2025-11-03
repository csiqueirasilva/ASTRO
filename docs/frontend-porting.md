# Front-End Porting Guide

The .NET 8 host now serves the *exact* HTML that production exposes by expanding the legacy Thymeleaf templates at runtime. Instead of rebuilding every page in Blazor, we render the original fragments through Razor views backed by a reusable resolver. This document explains how the pieces fit together and what to consider when evolving the UI.

## Current Strategy (Status: Complete)
- **TemplateResolver** (`Astro.Web/Services/TemplateResolver.cs`) loads files from `src/main/resources/templates`, processes `th:include` / `th:replace`, and substitutes inline expressions such as `[[${conteudo}]]`. The output is cached and fed directly to the Razor view.
- **TemplateWebGl.cshtml** mirrors `templatewebgl.html`. It injects the resolved fragments (`css`, `conteudo`, `ajuda`, `sobre`, `creditos`) into the DOM using `@Html.Raw`, preserving IDs, script tags, and ordering.
- **Static assets** (`src/main/resources/static`) are exposed via `wwwroot` through `CompositeFileProvider`, so URLs like `/js/jquery.min.js` remain valid without copying files.
- **Parity tests** (`TemplateParityTests`) compare the rendered markup for every public route against https://daed.on.br/astro/ and keep an allow-list for intentional differences (currently only the HTTPS YouTube embed).

This approach keeps the JavaScript-heavy WebGL pages untouched and gives us byte-for-byte equivalence with production while we continue porting backend services.

## Working with Templates

1. **Adding a new WebGL page**
   - Place the HTML fragment under `src/main/resources/templates/webgl/<slug>/`.
   - Expose the route in `SiteController` by calling `WebGl("<slug>")`.
   - Add the slug to `docs/routes-and-contracts.md` and, if it is published on the landing page, to `TemplateParityTests.RoutePairs` with any selector overrides needed.

2. **Updating shared fragments**
   - Modify the source template (`mainpage.html`, `templatewebgl.html`, `ferramentas/fragmentos/...`, etc.).
   - If the change intentionally diverges from production, document the rationale in `docs/migration-log.md` and register a normalization rule in `TemplateParityTests.ExpectedDifferences`.

3. **Inline expressions**
   - `TemplateResolver` currently handles simple key lookups (`[[${maxAnoTabuas}]]`). If a fragment needs arithmetic or conditional expressions, extend `ApplyInlineExpressions` with the required syntax and cover it with unit tests.

## Static Assets

- Continue to author JavaScript, CSS, images, OBJ models, etc. under `src/main/resources/static`. The ASP.NET Core host serves them via `UseStaticFiles` with `ServeUnknownFileTypes = true` to support the WebGL models.
- Keep submodules (`lib/on-daed-js`, `lib/on-physics`) checked out; the resolver and parity tests assume these paths exist.
- When updating assets that differ from production, note the change in `docs/migration-log.md` and, if necessary, relax tests with a patterned allow-list.

## Authoring Guidelines

- Preserve IDs and data attributes: JavaScript relies heavily on selectors such as `#canvas-wrapper`, `.form-magnetico-input`, and modal IDs.
- Use HTTPS for embeds and external assets whenever possible. If production still serves HTTP content, add a targeted expected difference until the upstream site is updated.
- Avoid reformatting HTML purely for style—whitespace changes can create false positives in parity tests.

## Testing & Tooling

- Run `dotnet test` after any template change. The parity harness fetches the production page, extracts the relevant section (defaults to `#canvas-wrapper` for WebGL tools, custom selectors for the calendar utilities), applies expected-difference replacements, and compares the normalized HTML.
- When the harness flags a difference:
  1. Inspect `/tmp/TemplateParityTests.*.html` (written when a failure occurs) to view both snippets.
  2. Decide whether to align the markup or codify an allow-list entry.
  3. Update `docs/routes-and-contracts.md` with any new selectors or exceptions.

## Future Work

This resolver-based bridge buys us time to focus on backend parity. Once every feature is validated, we can progressively replace templates with native Razor/Blazor components while relying on the parity suite to guarantee we do not break the public contract. Any such efforts should:

- Port one route at a time.
- Update `TemplateParityTests` to point at the new markup (or keep the resolver output as the comparison source during migration).
- Document the work in `docs/migration-log.md` so future maintainers understand which routes depend on the resolver vs. native components.

For now, treat the legacy HTML as canonical. All edits should go through the original templates, with the .NET runtime acting as a transparent host.
