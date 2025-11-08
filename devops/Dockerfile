# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy everything (the repo already contains only what the ASP.NET app needs).
COPY . .

RUN dotnet restore dotnet/ASTRO.Net.sln
RUN dotnet publish dotnet/Astro.Web/Astro.Web.csproj -c Release -o /app/publish /p:UseAppHost=false
RUN test -f /app/publish/Data/galilean_ephemeris.bin

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS magnetism-build
WORKDIR /mag
COPY external-dependencies/declinacao-magnetica /mag

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gfortran \
        libxm4 \
        libgl1 \
        libjpeg62-turbo \
        libmotif-common && \
    dpkg -i /mag/dislin-11.5.linux.i586_64.deb && \
    echo "/usr/local/dislin/lib" > /etc/ld.so.conf.d/dislin.conf && \
    ldconfig && \
    gfortran CARTA.f -o gerar -ldislin && \
    rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install DISLIN runtime dependencies and package
COPY external-dependencies/declinacao-magnetica/dislin-11.5.linux.i586_64.deb /tmp/dislin.deb
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libxm4 \
        libgl1 \
        libjpeg62-turbo \
        libmotif-common \
        libgfortran5 \
        libquadmath0 && \
    dpkg -i /tmp/dislin.deb && \
    echo "/usr/local/dislin/lib" > /etc/ld.so.conf.d/dislin.conf && \
    ldconfig && \
    rm /tmp/dislin.deb && \
    rm -rf /var/lib/apt/lists/*

# Ship the freshly compiled magnetic declination assets and binary
COPY --from=magnetism-build /mag /opt/declinacao-magnetica

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Astro.Web.dll"]
