using System;
using System.Globalization;
using System.Linq;
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

    [HttpGet("jupiter-satellites-track")]
    public ActionResult<JovianTrackResponse> GetJupiterSatellitesTrack(
        [FromQuery(Name = "jd")] double jd,
        [FromQuery] double hoursBefore = 360,
        [FromQuery] double hoursAfter = 360,
        [FromQuery] double stepMinutes = 60)
    {
        if (!_ephemeris.SupportsJulianDay(jd))
        {
            return BadRequest(new { error = $"Julian day {jd:F1} is outside the supported range." });
        }

        if (stepMinutes <= 0 || stepMinutes > 360)
        {
            return BadRequest(new { error = "stepMinutes must be between 0 and 360." });
        }

        var totalHours = hoursBefore + hoursAfter;
        if (totalHours <= 0 || totalHours > 720)
        {
            return BadRequest(new { error = "Total span must be greater than zero and not exceed 720 hours (30 days)." });
        }

        var response = new JovianTrackResponse
        {
            JulianDay = jd,
            HoursBefore = hoursBefore,
            HoursAfter = hoursAfter,
            StepMinutes = stepMinutes
        };

        var stepDays = stepMinutes / 1440.0;
        var startJd = jd - (hoursBefore / 24.0);
        var endJd = jd + (hoursAfter / 24.0);
        var steps = (int)Math.Floor((endJd - startJd) / stepDays) + 1;

        for (var i = 0; i < steps; i++)
        {
            var sampleJd = startJd + i * stepDays;
            if (!_ephemeris.SupportsJulianDay(sampleJd))
            {
                continue;
            }

            var model = _ephemeris.GetJovianSatellitesModel(sampleJd);
            var sample = new JovianTrackSample
            {
                JulianDay = sampleJd
            };

            foreach (var body in model.Results.OfType<CartesianCoordinates>())
            {
                var id = 0;
                if (body.Id is int intId)
                {
                    id = intId;
                }
                else if (body.Id is string stringId && int.TryParse(stringId, out var parsed))
                {
                    id = parsed;
                }

                sample.Bodies.Add(new JovianBodyState
                {
                    Id = id,
                    Name = body.Name,
                    X = double.Parse(body.X, CultureInfo.InvariantCulture),
                    Y = double.Parse(body.Y, CultureInfo.InvariantCulture),
                    Z = double.Parse(body.Z, CultureInfo.InvariantCulture),
                    VX = double.Parse(body.Vx, CultureInfo.InvariantCulture),
                    VY = double.Parse(body.Vy, CultureInfo.InvariantCulture),
                    VZ = double.Parse(body.Vz, CultureInfo.InvariantCulture)
                });
            }

            response.Samples.Add(sample);
        }

        return response;
    }
}
