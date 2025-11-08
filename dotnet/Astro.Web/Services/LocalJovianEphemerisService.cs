using System;
using System.Collections.Generic;
using System.IO;
using Astro.Web.Models.Horizons;

namespace Astro.Web.Services;

public sealed class LocalJovianEphemerisService : IJovianEphemerisService
{
    private const double SecondsPerDay = 86_400.0;
    private const double AuInKm = 149_597_870.7;
    private const double MuSun = 1.32712440018e11; // km^3 / s^2
    private const double SunMassKg = 1.98847e30;
    private const double EarthMassKg = 5.9722e24;
    private const double SunRadiusKm = 696_340.0;
    private const double EarthRadiusKm = 6_371.0;

    private static readonly double EarthMassSolarUnits = EarthMassKg / SunMassKg;
    private static readonly double EarthRadiusAu = EarthRadiusKm / AuInKm;
    private static readonly double SunRadiusAu = SunRadiusKm / AuInKm;

    private readonly IReadOnlyList<MoonInfo> _moons = new[]
    {
        new MoonInfo(501, "IO", 8.931938e22 / SunMassKg, 1_821.6 / AuInKm),
        new MoonInfo(502, "EUROPA", 4.799844e22 / SunMassKg, 1_560.8 / AuInKm),
        new MoonInfo(503, "GANYMEDE", 1.4819e23 / SunMassKg, 2_631.2 / AuInKm),
        new MoonInfo(504, "CALLISTO", 1.075938e23 / SunMassKg, 2_410.3 / AuInKm)
    };

    private static readonly PlanetElements EarthElements = new(
        SemiMajorAxisAu: 1.000001018,
        SemiMajorAxisRateAu: 0.0,
        Eccentricity: 0.01670862,
        EccentricityRate: -0.000042037,
        InclinationDeg: 0.00005,
        InclinationRateDeg: -0.013371,
        LongitudeAscendingNodeDeg: -11.26064,
        LongitudeAscendingNodeRateDeg: -0.0002,
        LongitudePerihelionDeg: 102.93768193,
        LongitudePerihelionRateDeg: 0.32327364,
        MeanLongitudeDeg: 100.46457166,
        MeanLongitudeRateDeg: 35999.37244981);

    private static readonly PlanetElements JupiterElements = new(
        SemiMajorAxisAu: 5.20288700,
        SemiMajorAxisRateAu: -0.00011607,
        Eccentricity: 0.04838624,
        EccentricityRate: -0.00013253,
        InclinationDeg: 1.30439695,
        InclinationRateDeg: -0.00183714,
        LongitudeAscendingNodeDeg: 100.55615,
        LongitudeAscendingNodeRateDeg: 0.0003205,
        LongitudePerihelionDeg: 14.75385,
        LongitudePerihelionRateDeg: 0.21252668,
        MeanLongitudeDeg: 34.40438,
        MeanLongitudeRateDeg: 3034.74612775);

    private static readonly Ephemeris EphemerisTable = Ephemeris.Load();

    public bool SupportsJulianDay(double jd) => EphemerisTable.Contains(jd);

    public HorizonsResultCollection GetJovianSatellitesModel(double jd)
    {
        if (!EphemerisTable.Contains(jd))
        {
            throw new ArgumentOutOfRangeException(nameof(jd), jd, $"Julian day must be within [{EphemerisTable.MinJulianDay}, {EphemerisTable.MaxJulianDay}].");
        }

        var collection = new HorizonsResultCollection
        {
            JulianDay = jd
        };

        var (earthPos, earthVel, jupiterPos, jupiterVel) = ComputePlanetStates(jd);
        var sunPos = jupiterPos.Scale(-1);
        var sunVel = jupiterVel.Scale(-1);

        collection.Results.Add(CreateCartesian(10, "SUN", sunPos, sunVel, 1.0, SunRadiusAu));

        foreach (var moon in _moons)
        {
            var state = EphemerisTable.Sample(moon.Id, jd);
            collection.Results.Add(CreateCartesian(moon.Id, moon.Name, state.Position, state.Velocity, moon.MassSolarUnits, moon.RadiusAu));
        }

        var earthRelative = earthPos - jupiterPos;
        var earthRelativeVel = earthVel - jupiterVel;
        collection.Results.Add(CreateCartesian(399, "EARTH", earthRelative, earthRelativeVel, EarthMassSolarUnits, EarthRadiusAu));

        return collection;
    }

    private static CartesianCoordinates CreateCartesian(int id, string name, Vector3 positionKm, Vector3 velocityKmPerSec, double? massSolarUnits, double? radiusAu)
    {
        return new CartesianCoordinates(
            positionKm.X / AuInKm,
            positionKm.Y / AuInKm,
            positionKm.Z / AuInKm,
            velocityKmPerSec.X / AuInKm * SecondsPerDay,
            velocityKmPerSec.Y / AuInKm * SecondsPerDay,
            velocityKmPerSec.Z / AuInKm * SecondsPerDay)
        {
            Id = id,
            Name = name,
            Mass = massSolarUnits,
            Radius = radiusAu
        };
    }

    private static (Vector3 EarthPos, Vector3 EarthVel, Vector3 JupiterPos, Vector3 JupiterVel) ComputePlanetStates(double jd)
    {
        var t = (jd - 2451545.0) / 36525.0;
        var earth = ComputePlanet(EarthElements, t);
        var jupiter = ComputePlanet(JupiterElements, t);
        return (earth.PositionKm, earth.VelocityKmPerSec, jupiter.PositionKm, jupiter.VelocityKmPerSec);
    }

    private static (Vector3 PositionKm, Vector3 VelocityKmPerSec) ComputePlanet(PlanetElements elements, double t)
    {
        var aAu = elements.SemiMajorAxisAu + elements.SemiMajorAxisRateAu * t;
        var e = elements.Eccentricity + elements.EccentricityRate * t;
        var i = DegreesToRadians(elements.InclinationDeg + elements.InclinationRateDeg * t);
        var omega = DegreesToRadians(elements.LongitudeAscendingNodeDeg + elements.LongitudeAscendingNodeRateDeg * t);
        var wBar = DegreesToRadians(elements.LongitudePerihelionDeg + elements.LongitudePerihelionRateDeg * t);
        var L = DegreesToRadians(elements.MeanLongitudeDeg + elements.MeanLongitudeRateDeg * t);
        var argumentPeriapsis = NormalizeAngle(wBar - omega);
        var meanAnomaly = NormalizeAngle(L - wBar);

        var aKm = aAu * AuInKm;
        var meanMotion = Math.Sqrt(MuSun / (aKm * aKm * aKm));
        var eccentricAnomaly = SolveKepler(meanAnomaly, e);
        var cosE = Math.Cos(eccentricAnomaly);
        var sinE = Math.Sin(eccentricAnomaly);
        var sqrtOneMinusESquared = Math.Sqrt(Math.Max(1e-12, 1 - e * e));

        var xOrb = aKm * (cosE - e);
        var yOrb = aKm * sqrtOneMinusESquared * sinE;

        var factor = 1.0 / (1.0 - e * cosE);
        var vxOrb = -aKm * meanMotion * sinE * factor;
        var vyOrb = aKm * meanMotion * sqrtOneMinusESquared * cosE * factor;

        var orientation = Orientation.FromAngles(omega, i, argumentPeriapsis);
        var position = orientation.Transform(xOrb, yOrb, 0.0);
        var velocity = orientation.Transform(vxOrb, vyOrb, 0.0);

        return (position, velocity);
    }

    private static double SolveKepler(double meanAnomaly, double eccentricity)
    {
        var e = meanAnomaly;
        for (var i = 0; i < 8; i++)
        {
            var delta = (e - eccentricity * Math.Sin(e) - meanAnomaly) / (1 - eccentricity * Math.Cos(e));
            e -= delta;
            if (Math.Abs(delta) < 1e-12)
            {
                break;
            }
        }

        return e;
    }

    private static double NormalizeAngle(double value)
    {
        var result = value % (Math.PI * 2.0);
        return result < 0 ? result + Math.PI * 2.0 : result;
    }

    private static double DegreesToRadians(double value) => value * Math.PI / 180.0;

    private readonly record struct MoonInfo(int Id, string Name, double? MassSolarUnits, double? RadiusAu);

    private readonly record struct PlanetElements(
        double SemiMajorAxisAu,
        double SemiMajorAxisRateAu,
        double Eccentricity,
        double EccentricityRate,
        double InclinationDeg,
        double InclinationRateDeg,
        double LongitudeAscendingNodeDeg,
        double LongitudeAscendingNodeRateDeg,
        double LongitudePerihelionDeg,
        double LongitudePerihelionRateDeg,
        double MeanLongitudeDeg,
        double MeanLongitudeRateDeg);

    private readonly record struct Orientation(Vector3 PHat, Vector3 QHat)
    {
        public static Orientation FromAngles(double ascendingNode, double inclination, double argumentPeriapsis)
        {
            var cosO = Math.Cos(ascendingNode);
            var sinO = Math.Sin(ascendingNode);
            var cosI = Math.Cos(inclination);
            var sinI = Math.Sin(inclination);
            var cosW = Math.Cos(argumentPeriapsis);
            var sinW = Math.Sin(argumentPeriapsis);

            var pHat = new Vector3(
                cosO * cosW - sinO * sinW * cosI,
                sinO * cosW + cosO * sinW * cosI,
                sinW * sinI);

            var qHat = new Vector3(
                -cosO * sinW - sinO * cosW * cosI,
                -sinO * sinW + cosO * cosW * cosI,
                cosW * sinI);

            return new Orientation(pHat, qHat);
        }

        public Vector3 Transform(double x, double y, double z) => PHat.Scale(x) + QHat.Scale(y);
    }

    private readonly record struct Vector3(double X, double Y, double Z)
    {
        public double Length => Math.Sqrt(X * X + Y * Y + Z * Z);

        public Vector3 Scale(double factor) => new(X * factor, Y * factor, Z * factor);

        public static Vector3 operator +(Vector3 left, Vector3 right) => new(left.X + right.X, left.Y + right.Y, left.Z + right.Z);

        public static Vector3 operator -(Vector3 left, Vector3 right) => new(left.X - right.X, left.Y - right.Y, left.Z - right.Z);
    }

    private readonly record struct MoonState(Vector3 Position, Vector3 Velocity);

    private sealed class Ephemeris
    {
        private readonly Dictionary<int, Table> _tables;

        private Ephemeris(Dictionary<int, Table> tables)
        {
            _tables = tables;
            MinJulianDay = double.MaxValue;
            MaxJulianDay = double.MinValue;
            foreach (var table in tables.Values)
            {
                if (table.StartJulianDay < MinJulianDay)
                {
                    MinJulianDay = table.StartJulianDay;
                }

                if (table.EndJulianDay > MaxJulianDay)
                {
                    MaxJulianDay = table.EndJulianDay;
                }
            }
        }

        public double MinJulianDay { get; }

        public double MaxJulianDay { get; }

        public static Ephemeris Load()
        {
            var baseDirectory = AppContext.BaseDirectory;
            var dataPath = Path.Combine(baseDirectory, "Data", "galilean_ephemeris.bin");
            if (!File.Exists(dataPath))
            {
                throw new FileNotFoundException($"Galilean ephemeris dataset not found at {dataPath}");
            }

            using var stream = File.OpenRead(dataPath);
            using var reader = new BinaryReader(stream);

            var tableCount = reader.ReadInt32();
            var tables = new Dictionary<int, Table>(tableCount);

            for (var i = 0; i < tableCount; i++)
            {
                var id = reader.ReadInt32();
                var startJd = reader.ReadDouble();
                var stepDays = reader.ReadDouble();
                var count = reader.ReadInt32();
                var data = new float[count * 6];
                for (var j = 0; j < data.Length; j++)
                {
                    data[j] = reader.ReadSingle();
                }

                tables[id] = new Table(id, startJd, stepDays, count, data);
            }

            return new Ephemeris(tables);
        }

        public bool Contains(double jd) => jd >= MinJulianDay && jd <= MaxJulianDay;

        public MoonState Sample(int id, double jd)
        {
            if (!_tables.TryGetValue(id, out var table))
            {
                throw new KeyNotFoundException($"No ephemeris table found for moon id {id}.");
            }

            return table.Sample(jd);
        }

        private sealed class Table
        {
            private readonly float[] _data;

            public Table(int id, double startJulianDay, double stepDays, int count, float[] data)
            {
                Id = id;
                StartJulianDay = startJulianDay;
                StepDays = stepDays;
                Count = count;
                _data = data;
            }

            public int Id { get; }

            public double StartJulianDay { get; }

            public double StepDays { get; }

            public int Count { get; }

            public double EndJulianDay => StartJulianDay + (Count - 1) * StepDays;

            public MoonState Sample(double jd)
            {
                if (jd < StartJulianDay || jd > EndJulianDay)
                {
                    throw new ArgumentOutOfRangeException(nameof(jd), jd, $"Julian day must be within [{StartJulianDay}, {EndJulianDay}].");
                }

                var index = (int)Math.Floor((jd - StartJulianDay) / StepDays);
                if (index < 0)
                {
                    index = 0;
                }
                else if (index >= Count - 1)
                {
                    index = Count - 2;
                }

                var fraction = (jd - (StartJulianDay + index * StepDays)) / StepDays;
                fraction = Math.Max(0.0, Math.Min(1.0, fraction));

                var stepSeconds = StepDays * SecondsPerDay;

                var p0 = GetVector(index);
                var v0 = GetVector(index, velocity: true);
                var p1 = GetVector(index + 1);
                var v1 = GetVector(index + 1, velocity: true);

                var t = fraction;
                var t2 = t * t;
                var t3 = t2 * t;

                var h00 = 2 * t3 - 3 * t2 + 1;
                var h10 = t3 - 2 * t2 + t;
                var h01 = -2 * t3 + 3 * t2;
                var h11 = t3 - t2;

                var position = p0.Scale(h00) + p1.Scale(h01) + v0.Scale(h10 * stepSeconds) + v1.Scale(h11 * stepSeconds);

                var dh00 = 6 * t2 - 6 * t;
                var dh10 = 3 * t2 - 4 * t + 1;
                var dh01 = -6 * t2 + 6 * t;
                var dh11 = 3 * t2 - 2 * t;

                var velocity = p0.Scale(dh00) + p1.Scale(dh01) + v0.Scale(dh10 * stepSeconds) + v1.Scale(dh11 * stepSeconds);
                velocity = velocity.Scale(1.0 / stepSeconds);

                return new MoonState(position, velocity);
            }

            private Vector3 GetVector(int index, bool velocity = false)
            {
                var offset = index * 6 + (velocity ? 3 : 0);
                return new Vector3(_data[offset], _data[offset + 1], _data[offset + 2]);
            }
        }
    }
}
