# ASTRO

Interactive astronomy visualizations and tools served by a modern ASP.NET Core application.  
This repository now focuses exclusively on the .NET 8 implementation while preserving the
previous Spring Boot codebase under `external-dependencies/prior-java-version/` for reference.

## Repository layout

| Path | Purpose |
| --- | --- |
| `dotnet/` | Main solution (`ASTRO.Net.sln`) containing the web site (`Astro.Web`) and supporting libraries/tests. |
| `dotnet/Astro.Web/LegacyStatic` | Former `src/main/resources/static` assets relinked into `wwwroot` at build time. |
| `dotnet/Astro.Web/LegacyTemplates` | Former Thymeleaf templates consumed directly by `SiteController`. |
| `scripts/` | Utility scripts (e.g., `build_jovian_ephemeris.py` to regenerate satellite ephemerides). |
| `docs/` | Markdown documentation plus the project wiki submodule. |
| `external-dependencies/prior-java-version/` | Full Maven project tree, images, and auxiliary resources from the legacy Java app. |

## Requirements

- [.NET SDK 8.0](https://dotnet.microsoft.com/download)
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

```bash
cd devops
docker compose up --build
```

The compose stack builds the image defined in `devops/Dockerfile`, boots it with `ASPNETCORE_ENVIRONMENT=Production`,
and publishes the container’s `8080` port on `http://localhost:16160`. A named volume (`astro-data-protection`)
persists ASP.NET Data Protection keys between runs so cookies remain valid across restarts. Stop with
`docker compose down`. If you need an ad‑hoc shell while keeping the published port, prefer
`docker compose run --service-ports astro-web`.

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

The historic Spring Boot implementation (source, `pom.xml`, `gfx/`, `imgs/`, `orbitas/`, etc.) now lives entirely under
`external-dependencies/prior-java-version/`. Nothing in the .NET solution references those files at build or runtime.
To inspect or rebuild the legacy app you can work inside that directory with Maven without affecting the modern stack.
