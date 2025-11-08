using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Astro.Web.Services;
using Xunit;

namespace Astro.Web.Tests;

public sealed class JovianEphemerisTests
{
    private static readonly (int Id, double X, double Y, double Z)[] J2000Expectations =
    {
        (501, 0.0026721991001246964, 0.0008637696946523953, 7.127264615783365e-05),
        (502, -0.0037514131182870693, -0.002380124802557012, -0.000120022547941866),
        (503, -0.005490078380672853, -0.004581865804466621, -0.00023101102412461554),
        (504, 0.0021732982444694214, 0.012381269072770894, 0.0004328520594991643)
    };

    private static readonly (int Id, double X, double Y, double Z)[] ObservationExpectations =
    {
        (501, 0.0012872556020771331, 0.0025168371229780614, 0.00010819865149203745),
        (502, 0.004386321516389295, -0.000988690909589534, 6.206450811535109e-05),
        (503, -0.005417597676401686, -0.004672850676829767, -0.0002567169249224795),
        (504, 0.0001695218754319274, 0.012559031965035182, 0.0003952647883120411)
    };

    private const double ToleranceAu = 3e-5; // ~4 500 km

    private const double UnitScale = 1.0 / 18216.0;
    private const double EarthOrbitRadiusKm = 149_597_870.7;
    private const double AuToModelUnits = EarthOrbitRadiusKm * UnitScale;

    private static readonly IReadOnlyDictionary<int, OrbitParameters> OrbitById = new Dictionary<int, OrbitParameters>
    {
        [501] = new OrbitParameters(421_769, 0.036),
        [502] = new OrbitParameters(671_079, 0.464),
        [503] = new OrbitParameters(1_070_042, 0.186),
        [504] = new OrbitParameters(1_882_700, 0.281)
    };

    [Fact]
    public void GalileanMoonsMatchHorizonsAtJ2000()
    {
        var service = new LocalJovianEphemerisService();
        var result = service.GetJovianSatellitesModel(2451545.0);

        AssertWithinTolerance(result, J2000Expectations);
    }

    [Fact]
    public void GalileanMoonsMatchHorizonsForObservationDate()
    {
        var service = new LocalJovianEphemerisService();
        var result = service.GetJovianSatellitesModel(2460974.722916667);

        AssertWithinTolerance(result, ObservationExpectations);
    }

    [Fact]
    public void FrontendDisplayOrderingMatchesProjectionModel()
    {
        var service = new LocalJovianEphemerisService();
        var result = service.GetJovianSatellitesModel(2460974.722916667);

        var displayOrdering = result.Results
            .Where(r => r.Id is int value && OrbitById.ContainsKey(value))
            .Select(r =>
            {
                var id = (int)r.Id!;
                var (displayX, displayY, displayZ) = ComputeDisplayCoordinates(id, r);
                return new
                {
                    id,
                    r.Name,
                    X = displayX,
                    Y = displayY,
                    Z = displayZ
                };
            })
            .OrderByDescending(entry => entry.X)
            .Select(entry => entry.Name)
            .ToArray();

        Assert.Equal(new[] { "EUROPA", "IO", "CALLISTO", "GANYMEDE" }, displayOrdering);
    }

    private static void AssertWithinTolerance(Astro.Web.Models.Horizons.HorizonsResultCollection result, (int Id, double X, double Y, double Z)[] expectations)
    {
        foreach (var (id, expectedX, expectedY, expectedZ) in expectations)
        {
            var actual = result.Results.Single(r => r.Id is int value && value == id);
            var x = double.Parse(actual.X, CultureInfo.InvariantCulture);
            var y = double.Parse(actual.Y, CultureInfo.InvariantCulture);
            var z = double.Parse(actual.Z, CultureInfo.InvariantCulture);

            Console.WriteLine($"{actual.Name}: x={x:G17} y={y:G17} z={z:G17}");

            var deltaX = Math.Abs(x - expectedX);
            var deltaY = Math.Abs(y - expectedY);
            var deltaZ = Math.Abs(z - expectedZ);

            if (deltaX > ToleranceAu && id == 501)
            {
                Console.WriteLine($"{id} actual=({x},{y},{z}) expected=({expectedX},{expectedY},{expectedZ}) Δx={deltaX}");
            }

            Assert.True(deltaX <= ToleranceAu, $"Δx for {actual.Name} exceeded tolerance. Δ={deltaX}");
            Assert.True(deltaY <= ToleranceAu, $"Δy for {actual.Name} exceeded tolerance. Δ={deltaY}");
            Assert.True(deltaZ <= ToleranceAu, $"Δz for {actual.Name} exceeded tolerance. Δ={deltaZ}");
        }
    }

    private static (double X, double Y, double Z) ComputeDisplayCoordinates(int id, Astro.Web.Models.Horizons.CartesianCoordinates coordinates)
    {
        var parameters = OrbitById[id];

        var xAu = double.Parse(coordinates.X, CultureInfo.InvariantCulture);
        var yAu = double.Parse(coordinates.Y, CultureInfo.InvariantCulture);

        var scaledX = xAu * AuToModelUnits;
        var scaledY = yAu * AuToModelUnits;

        var theta = Math.Atan2(scaledY, scaledX);
        var orbitRadiusUnits = parameters.OrbitalRadiusKm * UnitScale;
        var inclinationRad = parameters.InclinationDegrees * (Math.PI / 180.0);

        var cosTheta = Math.Cos(theta);
        var sinTheta = Math.Sin(theta);

        var parametricX = orbitRadiusUnits * cosTheta;
        var parametricZ = orbitRadiusUnits * sinTheta;

        var cosInc = Math.Cos(-inclinationRad);
        var sinInc = Math.Sin(-inclinationRad);

        var rotatedX = parametricX * cosInc;
        var rotatedY = parametricX * sinInc;
        var rotatedZ = parametricZ;

        var displayX = rotatedX;
        var displayY = -rotatedZ;
        var displayZ = rotatedY;

        return (displayX, displayY, displayZ);
    }

    private readonly record struct OrbitParameters(double OrbitalRadiusKm, double InclinationDegrees);

}
