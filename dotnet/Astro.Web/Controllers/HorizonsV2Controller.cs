using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Astro.Web.Models.Horizons;
using Astro.Web.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Astro.Web.Controllers;

[ApiExplorerSettings(IgnoreApi = true)]
[ApiController]
[Route("horizons-v2")]
public sealed class HorizonsV2Controller : ControllerBase
{
    private readonly IJovianEphemerisService _ephemeris;

    public HorizonsV2Controller(IJovianEphemerisService ephemeris)
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

    [HttpGet("jupiter-satellites-week")]
    public ActionResult<JovianTrackResponse> GetJupiterSatellitesWeek([FromQuery(Name = "jd")] double jd)
    {
        if (!_ephemeris.SupportsJulianDay(jd))
        {
            return BadRequest(new { error = $"Julian day {jd:F1} is outside the supported range." });
        }

        var targetDate = JulianDayToUtc(jd);
        var startOfWeek = GetStartOfWeekUtc(targetDate);
        var startJulianDay = DateTimeToJulianDay(startOfWeek);

        const int minutesPerWeek = 7 * 24 * 60;
        const double stepMinutes = 1.0;
        var stepDays = stepMinutes / 1440.0;

        var samples = new List<JovianTrackSample>(minutesPerWeek);

        for (var minute = 0; minute < minutesPerWeek; minute++)
        {
            var sampleJd = startJulianDay + minute * stepDays;
            if (!_ephemeris.SupportsJulianDay(sampleJd))
            {
                // Skip samples outside the ephemeris bounds.
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

            samples.Add(sample);
        }

        if (samples.Count == 0)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Ephemeris dataset does not cover the requested window." });
        }

        var effectiveStart = samples[0].JulianDay;
        var effectiveEnd = samples[^1].JulianDay;
        var coveredHours = Math.Max(0, (effectiveEnd - effectiveStart) * 24.0);
        if (samples.Count == 1)
        {
            coveredHours = Math.Min(coveredHours, 0);
        }

        var response = new JovianTrackResponse
        {
            JulianDay = effectiveStart,
            HoursBefore = 0,
            HoursAfter = Math.Min(7 * 24, coveredHours),
            StepMinutes = stepMinutes,
            TargetJulianDay = jd,
            Samples = samples
        };

        return response;
    }

    private static DateTime GetStartOfWeekUtc(DateTime utcDate)
    {
        if (utcDate.Kind != DateTimeKind.Utc)
        {
            utcDate = DateTime.SpecifyKind(utcDate, DateTimeKind.Utc);
        }

        var date = utcDate.Date;
        var dayOfWeek = (int)date.DayOfWeek;
        var offset = (dayOfWeek + 6) % 7; // Monday = 0
        return date.AddDays(-offset);
    }

    private static DateTime JulianDayToUtc(double jd)
    {
        var unixDays = jd - 2440587.5;
        return DateTime.UnixEpoch.AddDays(unixDays);
    }

    private static double DateTimeToJulianDay(DateTime utc)
    {
        if (utc.Kind != DateTimeKind.Utc)
        {
            utc = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        }

        return (utc - DateTime.UnixEpoch).TotalDays + 2440587.5;
    }
}
