using System;
using System.IO;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Astro.Web.Services;

// Cheap filesystem probes for /health; they never run the generator (a chart costs ~0.3 s of CPU).
public static class DependencyHealthChecks
{
    private const UnixFileMode AnyExecute = UnixFileMode.UserExecute | UnixFileMode.GroupExecute | UnixFileMode.OtherExecute;

    public static HealthCheckResult MagneticGenerator()
    {
        var path = CliMagneticPdfService.ExecutablePath;
        if (!File.Exists(path))
        {
            return HealthCheckResult.Unhealthy($"{path} not found.");
        }

        return OperatingSystem.IsWindows() || (File.GetUnixFileMode(path) & AnyExecute) != 0
            ? HealthCheckResult.Healthy(path)
            : HealthCheckResult.Unhealthy($"{path} is not executable.");
    }

    public static HealthCheckResult DislinLibrary()
    {
        // The generator links libdislin.so.11, resolved through LD_LIBRARY_PATH.
        var path = Path.Combine(CliMagneticPdfService.LibraryPath, "libdislin.so.11");
        return File.Exists(path)
            ? HealthCheckResult.Healthy(path)
            : HealthCheckResult.Unhealthy($"{path} not found.");
    }

    public static HealthCheckResult JovianEphemeris()
    {
        // Loads the dataset on first call (cached for the process lifetime); throws if it is missing or corrupt.
        return new LocalJovianEphemerisService().SupportsJulianDay(2461000.5)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Ephemeris loaded but does not cover JD 2461000.5.");
    }

    public static HealthCheckResult Templates(string contentRootPath)
    {
        var path = Path.Combine(contentRootPath, "LegacyTemplates", "mainpage.html");
        return File.Exists(path)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy($"{path} not found.");
    }
}
