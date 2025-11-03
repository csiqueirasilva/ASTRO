using System.Globalization;
using System.Text.Json.Serialization;

namespace Astro.Web.Models.Horizons;

public sealed class CartesianCoordinates : HorizonsResult
{
    private static readonly CultureInfo Culture = CultureInfo.InvariantCulture;

    public CartesianCoordinates(double x, double y, double z, double vx, double vy, double vz)
    {
        X = Format(x);
        Y = Format(y);
        Z = Format(z);
        Vx = Format(vx);
        Vy = Format(vy);
        Vz = Format(vz);
    }

    [JsonPropertyName("x")]
    public string X { get; }

    [JsonPropertyName("y")]
    public string Y { get; }

    [JsonPropertyName("z")]
    public string Z { get; }

    [JsonPropertyName("vx")]
    public string Vx { get; }

    [JsonPropertyName("vy")]
    public string Vy { get; }

    [JsonPropertyName("vz")]
    public string Vz { get; }

    private static string Format(double value) => value.ToString("G17", Culture);
}
