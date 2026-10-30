using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Astro.Web.Tests;

public sealed class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReportsEachDependencyAndMapsStatusToHttpCode()
    {
        var response = await _client.GetAsync("/health");
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var checks = body.RootElement.GetProperty("checks").EnumerateArray()
            .ToDictionary(c => c.GetProperty("name").GetString()!, c => c.GetProperty("status").GetString());

        Assert.Equal("Healthy", checks["jovian-ephemeris"]);
        Assert.Equal("Healthy", checks["templates"]);

        // The DISLIN generator only exists in the container/devcontainer; elsewhere it must be reported, not hidden.
        var generatorPresent = File.Exists("/opt/declinacao-magnetica/gerar") && File.Exists("/usr/local/dislin/libdislin.so.11");
        var expected = generatorPresent ? "Healthy" : "Unhealthy";
        Assert.Equal(expected, checks["magnetic-generator"]);
        Assert.Equal(expected, checks["dislin-library"]);
        Assert.Equal(expected, body.RootElement.GetProperty("status").GetString());
        Assert.Equal(generatorPresent ? HttpStatusCode.OK : HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }
}
