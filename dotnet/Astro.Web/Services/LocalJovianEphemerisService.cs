using System;
using System.Collections.Generic;
using Astro.Web.Models.Horizons;

namespace Astro.Web.Services;

public sealed class LocalJovianEphemerisService : IJovianEphemerisService
{
    private const double JdEpoch = 2451545.0; // J2000.0
    private const double TwoPi = Math.PI * 2.0;
    private const double DegToRad = Math.PI / 180.0;
    private const double AuInKm = 149_597_870.700;
    private const double SunMassKg = 1.98847e30;

    // Adopt a generous range that covers existing UI datasets (1900-2100)
    private const double MinSupportedJd = 2415020.5; // 1900-01-01
    private const double MaxSupportedJd = 2488069.5; // 2100-12-31

    private static readonly BodyDefinition Sun = new(
        Id: 10,
        Name: "SUN",
        SemiMajorAxisAu: 0.0,
        PeriodDays: 0.0,
        InclinationDeg: 0.0,
        MeanLongitudeAtEpochDeg: 0.0,
        AngularOffsetDeg: 0.0,
        MassKg: SunMassKg,
        RadiusKm: 696_340,
        Eccentricity: 0.0);

    private static readonly BodyDefinition Earth = new(
        Id: 399,
        Name: "EARTH",
        SemiMajorAxisAu: 1.000001018,
        PeriodDays: 365.256363004,
        InclinationDeg: 0.0,
        MeanLongitudeAtEpochDeg: 100.466457,
        AngularOffsetDeg: 0.0,
        MassKg: 5.9722e24,
        RadiusKm: 6_371,
        Eccentricity: 0.0167086);

    private static readonly BodyDefinition Jupiter = new(
        Id: 5,
        Name: "JUPITER",
        SemiMajorAxisAu: 5.202887,
        PeriodDays: 4332.589,
        InclinationDeg: 1.303,
        MeanLongitudeAtEpochDeg: 34.40438,
        AngularOffsetDeg: 14.75385,
        MassKg: 1.89813e27,
        RadiusKm: 69_911,
        Eccentricity: 0.04838624);

    private static readonly IReadOnlyList<BodyDefinition> GalileanMoons = new[]
    {
        new BodyDefinition(501, "IO", 421_769 / AuInKm, 1.769137786, 0.036, 171.0169, 43.977, 8.931938e22, 1_821.6, 0.0041),
        new BodyDefinition(502, "EUROPA", 671_079 / AuInKm, 3.551810, 0.464, 67.893, 219.106, 4.799844e22, 1_560.8, 0.0094),
        new BodyDefinition(503, "GANYMEDE", 1_070_042 / AuInKm, 7.154553, 0.186, 30.238, 63.552, 1.4819e23, 2_631.2, 0.0013),
        new BodyDefinition(504, "CALLISTO", 1_882_700 / AuInKm, 16.689018, 0.281, 262.731, 298.848, 1.075938e23, 2_410.3, 0.0074)
    };

    public bool SupportsJulianDay(double jd) => jd is >= MinSupportedJd and <= MaxSupportedJd;

    public HorizonsResultCollection GetJovianSatellitesModel(double jd)
    {
        var jupiterState = ComputeHeliocentricState(Jupiter, jd);
        var earthState = ComputeHeliocentricState(Earth, jd);

        var collection = new HorizonsResultCollection
        {
            JulianDay = jd
        };

        // Sun relative to Jupiter (Sun is at origin in heliocentric frame)
        collection.Results.Add(CreateCartesian(Sun, Negate(jupiterState.Position), Negate(jupiterState.Velocity)));

        foreach (var moon in GalileanMoons)
        {
            var satelliteState = ComputeSatelliteState(moon, jd);
            collection.Results.Add(CreateCartesian(moon, satelliteState.Position, satelliteState.Velocity));
        }

        // Earth relative to Jupiter
        collection.Results.Add(CreateCartesian(
            Earth,
            Subtract(earthState.Position, jupiterState.Position),
            Subtract(earthState.Velocity, jupiterState.Velocity)));

        return collection;
    }

    private static CartesianCoordinates CreateCartesian(BodyDefinition body, Vector3 position, Vector3 velocity)
    {
        var massSolar = body.MassKg / SunMassKg;
        var radiusAu = body.RadiusKm / AuInKm;

        return new CartesianCoordinates(position.X, position.Y, position.Z, velocity.X, velocity.Y, velocity.Z)
        {
            Id = body.Id,
            Name = body.Name,
            Mass = double.IsFinite(massSolar) ? massSolar : null,
            Radius = double.IsFinite(radiusAu) ? radiusAu : null
        };
    }

    private static StateVector ComputeHeliocentricState(BodyDefinition body, double jd)
    {
        if (body.SemiMajorAxisAu.Equals(0.0))
        {
            return StateVector.Zero;
        }

        var t = jd - JdEpoch;
        var meanMotion = TwoPi / body.PeriodDays;
        var meanLongitude = (body.MeanLongitudeAtEpochDeg + meanMotion * t * 180.0 / Math.PI) % 360.0;
        if (meanLongitude < 0)
        {
            meanLongitude += 360.0;
        }

        var longitudeRad = meanLongitude * DegToRad;
        var inclinationRad = body.InclinationDeg * DegToRad;

        var eccentricity = body.Eccentricity;
        var semiMajorAxis = body.SemiMajorAxisAu;

        // Simple Keplerian ellipse with small eccentricity correction using mean anomaly approximation.
        var meanAnomaly = (meanLongitude - body.AngularOffsetDeg) * DegToRad;
        var eccentricAnomaly = SolveKepler(meanAnomaly, eccentricity);
        var trueAnomaly = 2.0 * Math.Atan2(Math.Sqrt(1 + eccentricity) * Math.Sin(eccentricAnomaly / 2.0),
                                           Math.Sqrt(1 - eccentricity) * Math.Cos(eccentricAnomaly / 2.0));

        var radius = semiMajorAxis * (1 - eccentricity * Math.Cos(eccentricAnomaly));

        var xOrb = radius * Math.Cos(trueAnomaly);
        var yOrb = radius * Math.Sin(trueAnomaly);

        var vxOrb = -Math.Sin(eccentricAnomaly) * meanMotion * semiMajorAxis / (1 - eccentricity * Math.Cos(eccentricAnomaly));
        var vyOrb = Math.Sqrt(1 - eccentricity * eccentricity) * Math.Cos(eccentricAnomaly) * meanMotion * semiMajorAxis / (1 - eccentricity * Math.Cos(eccentricAnomaly));

        // Inclination rotation about X-axis
        var sinI = Math.Sin(inclinationRad);
        var cosI = Math.Cos(inclinationRad);

        var x = xOrb;
        var y = yOrb * cosI;
        var z = yOrb * sinI;

        var vx = vxOrb;
        var vy = vyOrb * cosI;
        var vz = vyOrb * sinI;

        return new StateVector(new Vector3(x, y, z), new Vector3(vx, vy, vz));
    }

    private static StateVector ComputeSatelliteState(BodyDefinition body, double jd)
    {
        var t = jd - JdEpoch;
        var meanMotion = TwoPi / body.PeriodDays;
        var angle = (body.MeanLongitudeAtEpochDeg + meanMotion * t * 180.0 / Math.PI) % 360.0;
        if (angle < 0)
        {
            angle += 360.0;
        }

        var theta = angle * DegToRad;
        var inclination = body.InclinationDeg * DegToRad;
        var sinI = Math.Sin(inclination);
        var cosI = Math.Cos(inclination);

        var radius = body.SemiMajorAxisAu;

        var x = radius * Math.Cos(theta);
        var yPlane = radius * Math.Sin(theta);
        var y = yPlane * cosI;
        var z = yPlane * sinI;

        var angularVelocity = meanMotion;
        var vx = -radius * angularVelocity * Math.Sin(theta);
        var vyPlane = radius * angularVelocity * Math.Cos(theta);
        var vy = vyPlane * cosI;
        var vz = vyPlane * sinI;

        return new StateVector(new Vector3(x, y, z), new Vector3(vx, vy, vz));
    }

    private static double SolveKepler(double meanAnomaly, double eccentricity)
    {
        var e = meanAnomaly;
        for (var i = 0; i < 5; i++)
        {
            var delta = (e - eccentricity * Math.Sin(e) - meanAnomaly) / (1 - eccentricity * Math.Cos(e));
            e -= delta;
            if (Math.Abs(delta) < 1e-10)
            {
                break;
            }
        }

        return e;
    }

    private static Vector3 Negate(Vector3 vector) => new(-vector.X, -vector.Y, -vector.Z);

    private static Vector3 Subtract(Vector3 left, Vector3 right) => new(left.X - right.X, left.Y - right.Y, left.Z - right.Z);

    private readonly record struct StateVector(Vector3 Position, Vector3 Velocity)
    {
        public static StateVector Zero { get; } = new(Vector3.Zero, Vector3.Zero);
    }

    private readonly record struct Vector3(double X, double Y, double Z)
    {
        public static Vector3 Zero { get; } = new(0, 0, 0);
    }

    private readonly record struct BodyDefinition(
        object Id,
        string Name,
        double SemiMajorAxisAu,
        double PeriodDays,
        double InclinationDeg,
        double MeanLongitudeAtEpochDeg,
        double AngularOffsetDeg,
        double MassKg,
        double RadiusKm,
        double Eccentricity);
}
