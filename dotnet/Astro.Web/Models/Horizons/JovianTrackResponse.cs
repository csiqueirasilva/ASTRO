using System.Collections.Generic;

namespace Astro.Web.Models.Horizons;

public sealed class JovianTrackResponse
{
    public double JulianDay { get; init; }
    public double HoursBefore { get; init; }
    public double HoursAfter { get; init; }
    public double StepMinutes { get; init; }
    public double? TargetJulianDay { get; init; }
    public List<JovianTrackSample> Samples { get; init; } = new();
}

public sealed class JovianTrackSample
{
    public double JulianDay { get; init; }
    public List<JovianBodyState> Bodies { get; init; } = new();
}

public sealed class JovianBodyState
{
    public int Id { get; init; }
    public string? Name { get; init; }
    public double X { get; init; }
    public double Y { get; init; }
    public double Z { get; init; }
    public double VX { get; init; }
    public double VY { get; init; }
    public double VZ { get; init; }
}
