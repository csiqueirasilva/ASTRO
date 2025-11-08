using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Astro.Web;
using HtmlAgilityPack;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public class TemplateParityTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly HttpClient ProductionClient = new()
    {
        BaseAddress = new Uri("https://daed.on.br/astro/")
    };

    private readonly HttpClient _localClient;

    public TemplateParityTests(WebApplicationFactory<Program> factory)
    {
        _localClient = factory.CreateClient();
    }

    public static IEnumerable<object[]> RoutePairs()
    {
        yield return new object[] { "posicao-sol", "posicao-sol" };
        yield return new object[] { "posicao-lua", "posicao-lua" };
        yield return new object[] { "eclipses", "eclipses" };
        yield return new object[] { "old-satelites-jupiter", "satelites-jupiter" };
        yield return new object[] { "equacao-de-kepler", "equacao-de-kepler" };
        yield return new object[] { "linhas-de-forca", "linhas-de-forca" };
        yield return new object[] { "magnetismo-terrestre", "magnetismo-terrestre" };
        yield return new object[] { "mares", "mares" };
        yield return new object[] { "movimentos-da-terra", "movimentos-da-terra" };
        yield return new object[] { "obliquidade-da-ecliptica", "obliquidade-da-ecliptica" };
        yield return new object[] { "angulo-horario", "angulo-horario" };
        yield return new object[] { "coordenadas-equatoriais", "coordenadas-equatoriais" };
        yield return new object[] { "coordenadas-horizontais", "coordenadas-horizontais" };
        yield return new object[] { "coordenadas-eclipticas", "coordenadas-eclipticas" };
        yield return new object[] { "coordenadas-galacticas", "coordenadas-galacticas" };
        yield return new object[] { "coordenadas-supergalacticas", "coordenadas-supergalacticas" };
        yield return new object[] { "calendario-gregoriano", "calendario-gregoriano" };
        yield return new object[] { "data-juliana", "data-juliana" };
    }

    [Theory]
    [MemberData(nameof(RoutePairs))]
    public async Task Html_matches_current_production_output(string localPath, string remotePath)
    {
        var local = await _localClient.GetStringAsync(localPath);
        var remote = await ProductionClient.GetStringAsync(remotePath);

        var mismatches = new List<string>();

        foreach (var xpath in ResolveSections(localPath))
        {
            var mismatch = CompareSection(local, remote, localPath, xpath);
            if (mismatch is not null)
            {
                mismatches.Add(mismatch);
            }
        }

        Assert.True(!mismatches.Any(), string.Join(Environment.NewLine + Environment.NewLine, mismatches));
    }

    private static string? CompareSection(string localHtml, string remoteHtml, string routeKey, string xpath)
    {
        var localNode = SelectNode(localHtml, xpath);
        var remoteNode = SelectNode(remoteHtml, xpath);

        if (localNode is null)
        {
            return $"Local HTML missing node '{xpath}' for route '{routeKey}'.";
        }

        if (remoteNode is null)
        {
            return $"Production HTML missing node '{xpath}' for route '{routeKey}'.";
        }

        var localNorm = NormalizeSection(localNode);
        var remoteNorm = NormalizeSection(remoteNode);

        if (string.Equals(remoteNorm, localNorm, StringComparison.Ordinal))
        {
            return null;
        }

        localNorm = ApplyExpectedDifferences(localNorm, routeKey, xpath);
        remoteNorm = ApplyExpectedDifferences(remoteNorm, routeKey, xpath);

        if (string.Equals(remoteNorm, localNorm, StringComparison.Ordinal))
        {
            return null;
        }

        return FormatDifference(remoteNorm, localNorm, routeKey, xpath);
    }

    private static string? SelectNode(string html, string xpath)
    {
        var doc = new HtmlDocument();
        doc.LoadHtml(html);
        var node = doc.DocumentNode.SelectSingleNode(xpath);
        return node?.InnerHtml;
    }

    private static string NormalizeSection(string html)
    {
        var sanitized = Regex.Replace(html, @"\s+", " ");
        sanitized = sanitized.Replace('\'', '"');
        return sanitized.Trim();
    }

    private static IEnumerable<string> ResolveSections(string routeKey)
    {
        if (RouteSections.TryGetValue(routeKey, out var selectors))
        {
            return selectors;
        }

        return DefaultWebGlSections;
    }

    private static string ApplyExpectedDifferences(string html, string routeKey, string xpath)
    {
        foreach (var difference in EnumerateExpectedDifferences(routeKey, xpath))
        {
            html = difference.Pattern.Replace(html, difference.Replacement);
        }

        return html;
    }

    private static IEnumerable<ExpectedDifference> EnumerateExpectedDifferences(string routeKey, string xpath)
    {
        static IEnumerable<ExpectedDifference> Resolve(string key, string currentXpath)
        {
            if (ExpectedDifferences.TryGetValue(key, out var differences))
            {
                foreach (var difference in differences)
                {
                    if (difference.AppliesTo(currentXpath))
                    {
                        yield return difference;
                    }
                }
            }
        }

        foreach (var difference in Resolve(routeKey, xpath))
        {
            yield return difference;
        }

        foreach (var difference in Resolve(AllRoutesKey, xpath))
        {
            yield return difference;
        }
    }

    private static string FormatDifference(string expected, string actual, string routeKey, string xpath)
    {
        static string Clip(string value)
        {
            const int window = 200;
            if (value.Length <= window)
            {
                return value;
            }

            return value[..window] + "…";
        }

        return $"Mismatch for route '{routeKey}' at xpath '{xpath}'.{Environment.NewLine}" +
               $"Production snippet: {Clip(expected)}{Environment.NewLine}" +
               $"Local snippet:      {Clip(actual)}";
    }

    private static readonly string[] DefaultWebGlSections =
    {
        "//*[@id='canvas-wrapper']"
    };

    private static readonly Dictionary<string, string[]> RouteSections = new(StringComparer.OrdinalIgnoreCase)
    {
        ["calendario-gregoriano"] = new[] { "//div[contains(@class,'campo-de-input')]" },
        ["data-juliana"] = new[] { "//div[contains(@class,'campo-de-input')]" }
    };

    private static readonly Dictionary<string, ExpectedDifference[]> ExpectedDifferences = new(StringComparer.OrdinalIgnoreCase)
    {
        [AllRoutesKey] = new[]
        {
            new ExpectedDifference(
                new Regex(@"1987-\d{4}", RegexOptions.Compiled),
                "1987-2015")
        },
        ["magnetismo-terrestre"] = new[]
        {
            new ExpectedDifference(
                new Regex(@"src=""https?://www\.youtube\.com/(embed|watch\?v=)J5bzSPJc5G8[^""]*""",
                    RegexOptions.IgnoreCase | RegexOptions.Compiled),
                @"src=""https://www.youtube.com/watch?v=J5bzSPJc5G8""")
        }
    };

    private const string AllRoutesKey = "*";

    private sealed record ExpectedDifference(Regex Pattern, string Replacement, string? XPath = null)
    {
        public bool AppliesTo(string xpath) => XPath is null || string.Equals(xpath, XPath, StringComparison.OrdinalIgnoreCase);
    }
}
