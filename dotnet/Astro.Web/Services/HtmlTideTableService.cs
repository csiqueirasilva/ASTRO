using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using AngleSharp.Dom;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;
using Astro.Domain.Ocean;
using Astro.Domain.Services;
using Microsoft.Extensions.Logging;

namespace Astro.Web.Services;

public sealed class HtmlTideTableService : ITideTableService
{
    private const string IndexPage = "index.htm";
    private static readonly Regex EstadoPattern = new("(?:[(])?ESTADO D(?:O|E|A) (.*)[)]", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex AnoPattern = new("\\d+", RegexOptions.Compiled);
    private static readonly Regex SpecialIdentifier = new("40252[a-zA-Z]{3}2011", RegexOptions.Compiled);

    private readonly HttpClient _httpClient;
    private readonly HtmlParser _parser;
    private readonly ILogger<HtmlTideTableService> _logger;

    public HtmlTideTableService(HttpClient httpClient, ILogger<HtmlTideTableService> logger)
    {
        _httpClient = httpClient;
        _parser = new HtmlParser();
        _logger = logger;

        if (_httpClient.BaseAddress is null)
        {
            _httpClient.BaseAddress = new Uri("https://www.marinha.mil.br/dhn/chm/box-previsao-mare/tabuas/");
        }

        if (!_httpClient.DefaultRequestHeaders.UserAgent.Any())
        {
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Astro.Net/1.0 (+https://github.com/observatorio-nacional)");
        }
    }

    public async Task<IReadOnlyCollection<PortoData>?> GetPortsAsync(CancellationToken cancellationToken)
    {
        var document = await LoadDocumentAsync(IndexPage, cancellationToken);
        if (document is null)
        {
            return null;
        }

        var select = document.QuerySelector("select[name='cboNomePorto']");
        if (select is null)
        {
            _logger.LogWarning("Could not find the tide table port selector on the DHN page.");
            return null;
        }

        var portList = new List<PortoData>();

        foreach (var option in select.Children.OfType<IHtmlOptionElement>())
        {
            var rawName = option.TextContent?.Trim();
            if (string.IsNullOrEmpty(rawName))
            {
                continue;
            }

            var codigo = option.Value?.Trim();
            if (string.IsNullOrEmpty(codigo))
            {
                continue;
            }

            var nome = NormalizePortName(rawName);

            var porto = new PortoData
            {
                Codigo = codigo,
                Nome = nome
            };

            if (rawName.Contains("Previsões até", StringComparison.OrdinalIgnoreCase))
            {
                var anoMatch = AnoPattern.Match(rawName);
                if (anoMatch.Success && int.TryParse(anoMatch.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var anoMax))
                {
                    porto.AnoMaximo = anoMax;
                }
            }

            AdjustHistoricalRanges(portList, porto);
            portList.Add(porto);
        }

        return portList
            .OrderBy(p => p.Nome, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public async Task<int?> GetLatestYearAsync(CancellationToken cancellationToken)
    {
        var document = await LoadDocumentAsync(IndexPage, cancellationToken);
        if (document is null)
        {
            return 2016;
        }

        var option = document.QuerySelector("select[name='cboAno'] option");
        if (option is not IHtmlOptionElement firstOption)
        {
            return 2016;
        }

        return int.TryParse(firstOption.Text().Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var year)
            ? year
            : 2016;
    }

    public async Task<TabuaMare?> GetTideTableAsync(string identifier, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return null;
        }

        var document = await LoadDocumentAsync($"{identifier}.htm", cancellationToken);
        if (document is null)
        {
            return null;
        }

        var table = document.QuerySelector("table");
        if (table is null)
        {
            _logger.LogWarning("No tide table grid found for identifier {Identifier}.", identifier);
            return null;
        }

        var result = new TabuaMare();

        if (SpecialIdentifier.IsMatch(identifier))
        {
            PopulateSpecialTable(result);
        }
        else
        {
            PopulateMetadata(document, result);
        }

        PopulateEntries(table, result);

        return result;
    }

    private async Task<IDocument?> LoadDocumentAsync(string relativePath, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync(relativePath, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("DHN tide table request failed with status {StatusCode} for {Path}.",
                    response.StatusCode, relativePath);
                return null;
            }

            await using var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new StreamReader(contentStream, Encoding.GetEncoding("ISO-8859-1"), leaveOpen: false);
            var html = await reader.ReadToEndAsync(cancellationToken);
            return await _parser.ParseDocumentAsync(html, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.LogWarning(ex, "Failed to load DHN tide table document {Path}.", relativePath);
            return null;
        }
    }

    private static string NormalizePortName(string rawName)
    {
        var nome = rawName;
        var match = EstadoPattern.Match(nome);
        if (match.Success)
        {
            var estado = match.Groups[1].Value;
            nome = $"{estado} - {nome.Replace(match.Value, string.Empty).Trim()}";
        }

        return nome;
    }

    private static void AdjustHistoricalRanges(ICollection<PortoData> existing, PortoData novo)
    {
        foreach (var antigo in existing)
        {
            var antigoNome = (antigo.Nome ?? string.Empty).Replace(")", string.Empty).Replace("(", string.Empty);
            var novoNome = (novo.Nome ?? string.Empty).Replace(")", string.Empty).Replace("(", string.Empty);

            if (antigoNome.Contains(novoNome, StringComparison.OrdinalIgnoreCase)
                || novoNome.Contains(antigoNome, StringComparison.OrdinalIgnoreCase))
            {
                var anoMax = antigo.AnoMaximo ?? 2011;
                antigo.AnoMaximo ??= anoMax;
                novo.AnoMinimo = anoMax + 1;
                novo.Nome = novo.Nome;
                return;
            }
        }

        switch (novo.Nome?.ToUpperInvariant())
        {
            case "ESTAÇÃO ANTÁRTICA COMANDANTE FERRAZ":
                novo.AnoMinimo = 2009;
                break;
            case "CAPITANIA DOS PORTOS DE SERGIPE":
                novo.AnoMinimo = 2006;
                break;
            case "PORTO DE MACAU":
                novo.AnoMinimo = 2007;
                break;
        }
    }

    private static void PopulateSpecialTable(TabuaMare target)
    {
        target.Latitude = "20º19,1'S";
        target.Longitude = "040º17,8'W";
        target.Fuso = "+03.0";
        target.Ano = "2011";
        target.NivelMedio = "0.81";
        target.Carta = "01401";
        target.Componentes = "51";
        target.Nome = "PORTO DE VITÓRIA - CAPITANIA DOS PORTOS DO ES (ESTADO DO ESPÍRITO SANTO)";
    }

    private static void PopulateMetadata(IDocument document, TabuaMare target)
    {
        var strongNodes = document.QuerySelectorAll("strong");
        if (strongNodes.Length == 0)
        {
            return;
        }

        static string? ExtractValue(IElement element)
        {
            var parentText = element.ParentElement?.TextContent ?? string.Empty;
            var label = element.TextContent;
            var index = parentText.IndexOf(label, StringComparison.Ordinal);
            if (index < 0)
            {
                return null;
            }

            var value = parentText[(index + label.Length)..].Trim();
            return value.Trim(':').Trim();
        }

        foreach (var element in strongNodes)
        {
            var label = element.TextContent.Trim().ToUpperInvariant();

            switch (label)
            {
                case "LATITUDE:":
                    target.Latitude = ExtractValue(element);
                    break;
                case "LONGITUDE:":
                    target.Longitude = ExtractValue(element);
                    break;
                case "FUSO:":
                    target.Fuso = ExtractValue(element);
                    break;
                case "ANO:":
                    target.Ano = ExtractValue(element);
                    break;
                case "INSTITUIÇÃO RESPONSÁVEL:":
                case "INSTITUIÇÃO RESPONSAVEL:":
                    target.Instituicao = ExtractValue(element);
                    break;
                case "NÍVEL MÉDIO:":
                case "NIVEL MÉDIO:":
                case "NIVEL MEDIO:":
                    target.NivelMedio = ExtractValue(element);
                    break;
                case "CARTA NÁUTICA:":
                case "CARTA NAUTICA:":
                    target.Carta = ExtractValue(element);
                    break;
                default:
                    if (label.Contains("COMPONENTES", StringComparison.Ordinal))
                    {
                        var value = ExtractValue(element);
                        if (!string.IsNullOrEmpty(value))
                        {
                            var match = AnoPattern.Match(value);
                            if (match.Success)
                            {
                                target.Componentes = match.Groups[0].Value.Trim();
                            }
                        }
                    }
                    break;
            }
        }

        var headerCandidate = strongNodes.Select(e => e.ParentElement?.ParentElement)
            .FirstOrDefault(p => p is not null && !string.IsNullOrWhiteSpace(p.TextContent));

        target.Nome ??= headerCandidate?.TextContent?.Trim();
    }

    private static void PopulateEntries(IElement table, TabuaMare target)
    {
        var rows = table.QuerySelectorAll("tr").Skip(1).ToArray();
        if (rows.Length == 0)
        {
            return;
        }

        TideTableEntry? currentEntry = null;

        foreach (var row in rows)
        {
            var cells = row.Children;
            if (cells.Length != 4)
            {
                continue;
            }

            var day = cells[1].TextContent.Trim();
            if (!string.IsNullOrEmpty(day))
            {
                currentEntry = new TideTableEntry
                {
                    Dia = day
                };
                target.Entradas.Add(currentEntry);
            }
            else if (currentEntry is null)
            {
                continue;
            }

            var moonImg = cells[0].QuerySelector("img");
            if (moonImg is not null)
            {
                var src = moonImg.GetAttribute("src") ?? string.Empty;
                currentEntry!.Lua = src.ToUpperInvariant().Replace(".GIF", string.Empty, StringComparison.Ordinal);
            }

            var hora = cells[2].TextContent.Trim();
            var altura = cells[3].TextContent.Trim();

            if (!string.IsNullOrEmpty(hora))
            {
                currentEntry!.HoraAltura[hora] = altura;
            }
        }
    }
}
