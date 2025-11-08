using System;
using System.Linq;
using System.Net.Http.Json;
using Astro.Web.Models.Horizons;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Astro.Web.Tests;

public sealed class HorizonsEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HorizonsEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Track_endpoint_returns_samples()
    {
        var response = await _client.GetAsync("horizons/jupiter-satellites-track?jd=2451545&hoursBefore=6&hoursAfter=6&stepMinutes=60");
        response.EnsureSuccessStatusCode();

        var track = await response.Content.ReadFromJsonAsync<JovianTrackResponse>();
        Assert.NotNull(track);
        Assert.NotEmpty(track!.Samples);

        var firstSample = track.Samples.First();
        Assert.NotEmpty(firstSample.Bodies);
        Assert.Contains(firstSample.Bodies, body => string.Equals(body.Name, "IO", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Weekly_endpoint_returns_minute_samples()
    {
        var response = await _client.GetAsync("horizons-v2/jupiter-satellites-week?jd=2451545");
        response.EnsureSuccessStatusCode();

        var track = await response.Content.ReadFromJsonAsync<JovianTrackResponse>();
        Assert.NotNull(track);
        Assert.NotEmpty(track!.Samples);
        Assert.True(track.StepMinutes <= 1.0);
        Assert.InRange(track.HoursAfter, 0, 7 * 24);
        Assert.Equal(0, track.HoursBefore);
        Assert.InRange(track.Samples.Count, 1, 7 * 24 * 60);
        Assert.NotNull(track.TargetJulianDay);
        Assert.True(Math.Abs(track.TargetJulianDay!.Value - 2451545) < 1e-6);
    }
}
