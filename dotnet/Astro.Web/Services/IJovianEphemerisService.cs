using Astro.Web.Models.Horizons;

namespace Astro.Web.Services;

public interface IJovianEphemerisService
{
    bool SupportsJulianDay(double jd);

    HorizonsResultCollection GetJovianSatellitesModel(double jd);
}
