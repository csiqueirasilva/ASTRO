using System.Text.Json.Serialization;

namespace Astro.Web.Models.Horizons;

public abstract class HorizonsResult
{
    [JsonPropertyName("id")]
    public object? Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("mass")]
    public double? Mass { get; init; }

    [JsonPropertyName("radius")]
    public double? Radius { get; init; }
}
