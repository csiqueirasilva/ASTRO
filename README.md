# ASTRO

Interactive astronomy visualizations and tools served by a modern ASP.NET Core application.  
This repository focuses exclusively on the .NET 10 implementation. The previous Spring Boot codebase
and the retired DHN tide-table integration are preserved on the `historico` branch.

## Repository layout

| Path | Purpose |
| --- | --- |
| `dotnet/` | Main solution (`ASTRO.Net.sln`) containing the web site (`Astro.Web`) and supporting libraries/tests. |
| `dotnet/Astro.Web/LegacyStatic` | Former `src/main/resources/static` assets relinked into `wwwroot` at build time. |
| `dotnet/Astro.Web/LegacyTemplates` | Former Thymeleaf templates consumed directly by `SiteController`. |
| `scripts/` | Utility scripts (e.g., `build_jovian_ephemeris.py` to regenerate satellite ephemerides). |
| `docs/` | Markdown documentation plus the project wiki submodule. |
| `external-dependencies/declinacao-magnetica/` | DISLIN package and Fortran source used to generate the magnetic charts. |

## Requirements

- [.NET SDK 10.0](https://dotnet.microsoft.com/download)
- Python 3.10+ (only when regenerating ephemeris datasets)
- Git submodules (`git submodule update --init --recursive`)
- Optional: Docker + VS Code Dev Containers if you prefer the provided `.devcontainer/`

## Getting started

```bash
# install submodules
git submodule update --init --recursive

# restore NuGet packages
dotnet restore dotnet/ASTRO.Net.sln
```

## Running the site locally

```bash
dotnet run --project dotnet/Astro.Web/Astro.Web.csproj
```

The development server listens on Kestrel’s default URLs (see console output, typically `https://localhost:5248`).
Frontend changes under `dotnet/Astro.Web/LegacyStatic` and template edits under `dotnet/Astro.Web/LegacyTemplates`
are picked up without restarting while the app runs in `dotnet watch run`.

## Running with Docker

Production deployment guide (in Portuguese, for the infrastructure team): [`docs/implantacao.md`](docs/implantacao.md).

```bash
cd devops
docker compose up --build
```

The compose stack builds the image defined in `devops/Dockerfile`, boots it with `ASPNETCORE_ENVIRONMENT=Production`,
and publishes the container’s `8080` port on `http://localhost:16160`. A named volume (`astro-data-protection`)
persists ASP.NET Data Protection keys between runs so cookies remain valid across restarts. Stop with
`docker compose down`. If you need an ad‑hoc shell while keeping the published port, prefer
`docker compose run --service-ports astro-web`.

`GET /health` returns `200` with a JSON list of checks (`magnetic-generator`, `dislin-library`, `jovian-ephemeris`,
`templates`) when everything is in place, or `503` naming the failing check. The checks only probe files, so the
endpoint is cheap enough to poll. The image declares a Docker `HEALTHCHECK` against it (every 30 s, unhealthy after
3 failures), visible in `docker ps` / `docker inspect astro-web`. For a deeper post-incident check, request a chart
(`/pdf/dados-magneticos.pdf?ano=2020&tipo=1`), which actually runs the DISLIN generator.

> **Note:** the Docker build expects `dotnet/Astro.Web/Data/galilean_ephemeris.bin` to exist (generate it with
> `python3 scripts/build_jovian_ephemeris.py` when necessary). The Dockerfile checks for this artifact and fails fast
> if it is absent, preventing containers from starting without the Jovian dataset.

During the build we also compile the Fortran program (`external-dependencies/declinacao-magnetica/CARTA.f`) inside a
dedicated stage, install the DISLIN runtime plus its Fortran dependencies (`libgfortran5`, `libquadmath0`, etc.), and
copy the resulting assets into `/opt/declinacao-magnetica`, so magnetic PDF generation works in the container without
extra setup.

## Tests

```bash
dotnet test dotnet/ASTRO.Net.sln
```

Integration tests expect the precomputed Galilean ephemeris binary at `dotnet/Astro.Web/Data/galilean_ephemeris.bin`.

## Regenerating the Jovian ephemeris dataset

```bash
python3 scripts/build_jovian_ephemeris.py
```

The script queries NASA JPL Horizons, builds minute-resolution samples for Io, Europa, Ganymede, and Callisto,
and rewrites `dotnet/Astro.Web/Data/galilean_ephemeris.bin`. Rebuild the solution afterwards so the fresh data is copied.

## Legacy Java application

The historic Spring Boot implementation (source, `pom.xml`, `gfx/`, `imgs/`, `orbitas/`, etc.) was removed from `main`.
It lives under `external-dependencies/prior-java-version/` on the `historico` branch, together with the DHN tide-table
integration (`/tabua-mares`), retired after the Marinha site started blocking automated access.
