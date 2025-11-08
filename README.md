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

