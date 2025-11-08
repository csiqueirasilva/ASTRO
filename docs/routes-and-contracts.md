# Route & Contract Parity

This reference maps every HTTP endpoint in the current Spring Boot application to its .NET 8 counterpart and documents the expected request/response shapes. Use it as a checklist during the rewrite to guarantee nothing slips through.

## MVC / Page Endpoints

| Route | Java Handler | Response Type | Notes for .NET |
| --- | --- | --- | --- |
| `/` | `SiteController#index` | Thymeleaf view `mainpage` | Resolved via `TemplateResolver` and returned as `ContentResult`. |
| `/angulo-horario` | `SiteController#coordenadasHorarias` | `templatewebgl` with `conteudo=angulo-horario` | Rendered by `TemplateWebGl.cshtml` + resolver. |
| `/obliquidade-da-ecliptica` | `SiteController#ecliptica` | Same as above | Continue for every WebGL tool; see list below. |
| `/coordenadas-supergalacticas` | `SiteController#coordenadasSupergalacticas` | `templatewebgl` |  |
| `/coordenadas-galacticas` | `SiteController#coordenadasGalacticas` | `templatewebgl` |  |
| `/coordenadas-eclipticas` | `SiteController#coordenadasEclipticas` | `templatewebgl` |  |
| `/coordenadas-horizontais` | `SiteController#coordenadasHorizontais` | `templatewebgl` |  |
| `/coordenadas-equatoriais` | `SiteController#coordenadasEquatoriais` | `templatewebgl` |  |
| `/mares` | `SiteController#mares` | `templatewebgl` |  |
| `/magnetismo-terrestre` | `SiteController#magnetismoTerrestre` | `templatewebgl` | Ensure PDF modal still posts to `/csv`. |
| `/linhas-de-forca` | `SiteController#linhasDeForca` | `templatewebgl` |  |
| `/posicao-sol` | `SiteController#posicaoSol` | `templatewebgl` |  |
| `/posicao-lua` | `SiteController#posicaoLua` | `templatewebgl` |  |
| `/satelites-jupiter` | `SiteController#satelitesJupiter` | `templatewebgl` |  |
| `/orbitas` | `SiteController#orbitas` | `templatewebgl` |  |
| `/grafico-globo` | `SiteController#graficoGlobo` | `templatewebgl` |  |
| `/equacao-de-kepler` | `SiteController#equacaoKepler` | `templatewebgl` |  |
| `/movimentos-da-terra` | `SiteController#movimentosTerra` | `templatewebgl` |  |
| `/data-juliana` | `SiteController#dataJuliana` | `templatewebgl` | Selector override in parity tests: `//div[contains(@class,'campo-de-input')]`. |
| `/calendario-gregoriano` | `SiteController#calendarioGregoriano` | `templatewebgl` | Selector override: `//div[contains(@class,'campo-de-input')]`. |
| `/holo-piramide` | `SiteController#holoPiramide` | `templatewebgl` |  |
| `/grafico-globo` | `SiteController#graficoGlobo` | View `webgl/grafico-globo/grafico-globo` | Accepts optional `data` query; default `ead2015`. |
| `/holo-grafico-globo` | `SiteController#holoPiramide` | View `webgl/holo-piramide/grafico-globo` | Uses same `data` query fallback logic. |
| `/holo-grafico-globo-2` | `SiteController#holoPiramide2` | View `webgl/holo-piramide/grafico-globo-2` |  |
| `/orbitas` | `SiteController#orbitas` (redirect) | HTTP 302 → `/orbitas-{name}` | Implement redirect logic in .NET to match first available JSON file. |
| `/orbitas-{orbita}` | `SiteController#orbitas` (overload) | `templatewebgl` | Sets `arquivoDados` attribute for the selected orbit JSON. |
| `/tabua-mares` | `SiteController#tabuaMares` | JSON (`TreeSet<PortoData>`) | Return `IActionResult` with JSON; ensure ordering preserved. |
| `/tabua-mares/{tabuaMares}` | `SiteController#tabuaMares(String)` | JSON (`TabuaMare`) |  |
| `/pdf/dados-magneticos.pdf` | `SiteController#dadosMagneticos` | PDF stream | Reuse DISLIN generator; set identical headers. |

All remaining mappings from `SiteController` follow the same pattern—each route returns the WebGL template pointing to `templates/webgl/<slug>/conteudo.html`. Use this inventory when creating Blazor components:

```
angulo-horario
calendario-gregoriano
coordenadas-eclipticas
coordenadas-equatoriais
coordenadas-galacticas
coordenadas-horizontais
coordenadas-supergalacticas
data-juliana
eclipses
equacao-de-kepler
grafico-globo
holo-piramide
linhas-de-forca
magnetismo-terrestre
mares
movimentos-da-terra
obliquidade-da-ecliptica
orbitas
posicao-lua
posicao-sol
satelites-jupiter
```

Special pages:
- `/creditos`, `/quiz`, `/template-ferramenta` → static templates; convert to dedicated Razor pages.
- `/templatewebgl` is not publicly routed but referenced internally; its markup belongs in a reusable Blazor component/layout.

## HTML Parity Coverage

`tests/Astro.Web.Tests/TemplateParityTests.cs` acts as our contract test harness:

- **Routes covered**: every URL listed above plus `/posicao-sol`, `/posicao-lua`, `/eclipses`, `/satelites-jupiter`, `/equacao-de-kepler`, `/linhas-de-forca`, `/magnetismo-terrestre`, `/mares`, `/movimentos-da-terra`, `/obliquidade-da-ecliptica`, `/angulo-horario`, and the calendar tools.
- **Default selector**: `//*[@id='canvas-wrapper']` for WebGL pages, capturing the SVG/canvas container that the JavaScript populates.
- **Overrides**:
  - `calendario-gregoriano`, `data-juliana`: `//div[contains(@class,'campo-de-input')]`
- **Expected differences**: HTTPS YouTube embed on `/magnetismo-terrestre` (`src="https://www.youtube.com/watch?v=J5bzSPJc5G8"`). Update the allow-list if additional intentional deltas are introduced.

Running `dotnet test` after template changes guarantees that our HTML remains 1:1 with production. The harness prints a diff summary when mismatches occur and should be the first stop when diagnosing front-end regressions.

## API Endpoints

| Route | Java Handler | Method | Query Params | Response | .NET Notes |
| --- | --- | --- | --- | --- | --- |
| `/csv` | `ToolsController#csv` | POST | `titulos`, `corpo` form fields | `text/csv` attachment `export.csv` | Use `FileContentResult` with `ContentDisposition` header. |
| `/horizons/jupiter-satellites-model` | `HorizonsController#getJupiterSatellitesModel` | GET | `jd` (`Double`) | `HorizonsResultCollection` JSON | Powered by `HorizonsJovianEphemerisService`, which proxies JPL Horizons vectors and returns positions in AU/day. |
| `/horizons/sdm` | `HorizonsController#getStandardDynamicalModel` | GET | `jd` | Same as above |  |
| `/horizons/elements` | `HorizonsController#getElements` | GET | `id`, `jd` | Same as above | Accept `string`/`double` for `id` to handle numeric or string IDs. |
| `/horizons/vectors` | `HorizonsController#getVectors` | GET | `id`, `jd` | Same as above |  |

`HorizonsController` returns `null` when an operation fails. Decide whether to continue returning empty bodies (serializes as `null`) or upgrade to explicit HTTP status codes. Update the client scripts accordingly if behaviour changes.

## Static Assets

- All files under `src/main/resources/static` are served at `/` with relative paths (e.g., `/js/jquery.min.js`). Ensure `app.UseStaticFiles()` exposes identical URLs.
- Submodule assets (`lib/on-daed-js/…`) must remain under `/lib/on-daed-js/` after the port.

## Downloadable Content

- Magnetism PDF route (triggered inside the site) is not exposed directly but returns a PDF stream when the front-end requests it. Confirm the HTTP headers (`application/pdf`, `Content-Disposition: attachment; filename="dados-magneticos.pdf"` when applicable) stay the same.

## Future Enhancements

- Add automated contract tests (e.g., verify `/horizons/sdm?jd=2451545.0` returns the same JSON fields) comparing Java vs .NET outputs during the migration.
- Generate API documentation (Swagger) after the .NET port, but keep endpoints compatible with existing clients first.
