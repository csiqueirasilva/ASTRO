using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Astro.Web.Models.Horizons;

public sealed class HorizonsResultCollection
{
    [JsonPropertyName("jd")]
    public double JulianDay { get; init; }

    [JsonPropertyName("op")]
    public string Operation { get; init; } = "CARTESIAN";

    [JsonPropertyName("results")]
    public List<CartesianCoordinates> Results { get; } = new();
}
