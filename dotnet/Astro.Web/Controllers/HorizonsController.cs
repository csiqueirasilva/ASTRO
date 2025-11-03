using Astro.Web.Models.Horizons;
using Astro.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Astro.Web.Controllers;

[ApiExplorerSettings(IgnoreApi = true)]
[ApiController]
[Route("horizons")]
public sealed class HorizonsController : ControllerBase
{
    private readonly IJovianEphemerisService _ephemeris;

    public HorizonsController(IJovianEphemerisService ephemeris)
    {
        _ephemeris = ephemeris;
    }

    [HttpGet("jupiter-satellites-model")]
    public ActionResult<HorizonsResultCollection> GetJupiterSatellitesModel([FromQuery(Name = "jd")] double jd)
    {
        if (!_ephemeris.SupportsJulianDay(jd))
        {
            return BadRequest(new { error = $"Julian day {jd:F1} is outside the supported range." });
        }

        var result = _ephemeris.GetJovianSatellitesModel(jd);
        return result;
    }
}
