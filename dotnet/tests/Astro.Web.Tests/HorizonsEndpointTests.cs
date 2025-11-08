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

}
