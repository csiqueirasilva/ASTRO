using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Astro.Domain.Services;
using Astro.Web.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

namespace Astro.Web.Controllers;

[ApiExplorerSettings(IgnoreApi = true)]
[Route("")]
public class SiteController : Controller
{
    private const string WebGlViewName = "TemplateWebGl";
    private const string WebGlContentKey = "conteudo";
    private const string OrbitasViewName = "orbitas";
    private const string GraficoDefault = "ead2015";

    private readonly ITideTableService _tideTables;
    private readonly IMagneticPdfService _magneticPdf;
    private readonly IFileProvider _webRootFiles;
    private readonly ILogger<SiteController> _logger;
    private readonly IFileProvider _templateFiles;
    private readonly TemplateResolver _resolver;
    private readonly string? _creditosFragment;

    public SiteController(
        ITideTableService tideTables,
        IMagneticPdfService magneticPdf,
        IWebHostEnvironment environment,
        ILogger<SiteController> logger)
    {
        _tideTables = tideTables;
        _magneticPdf = magneticPdf;
        _logger = logger;
        _webRootFiles = environment.WebRootFileProvider;
        var templateCandidates = new[]
        {
            Path.Combine(environment.ContentRootPath, "LegacyTemplates"),
            Path.Combine(environment.ContentRootPath, "..", "..", "src", "main", "resources", "templates")
        };

        var templatesPath = templateCandidates.FirstOrDefault(Directory.Exists);
        _templateFiles = templatesPath is not null
            ? new PhysicalFileProvider(templatesPath)
            : new NullFileProvider();
        _resolver = new TemplateResolver(_templateFiles);
        _creditosFragment = _resolver.ResolveExpression("creditos :: creditos");
        if (!string.IsNullOrWhiteSpace(_creditosFragment))
        {
            _logger.LogDebug("Credit fragment sample: {Snippet}", _creditosFragment);
        }
    }

    [HttpGet("")]
    public IActionResult Index()
    {
        var html = _resolver.Resolve("mainpage.html");
        if (string.IsNullOrWhiteSpace(html))
        {
            return NotFound();
        }
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpGet("angulo-horario")]
    public IActionResult CoordenadasHorarias() => WebGl("angulo-horario");

    [HttpGet("obliquidade-da-ecliptica")]
    public IActionResult ObliquidadeDaEcliptica() => WebGl("obliquidade-da-ecliptica");

    [HttpGet("coordenadas-supergalacticas")]
    public IActionResult CoordenadasSupergalacticas() => WebGl("coordenadas-supergalacticas");

    [HttpGet("coordenadas-galacticas")]
    public IActionResult CoordenadasGalacticas() => WebGl("coordenadas-galacticas");

    [HttpGet("coordenadas-eclipticas")]
    public IActionResult CoordenadasEclipticas() => WebGl("coordenadas-eclipticas");

    [HttpGet("coordenadas-horizontais")]
    public IActionResult CoordenadasHorizontais() => WebGl("coordenadas-horizontais");

    [HttpGet("coordenadas-equatoriais")]
    public IActionResult CoordenadasEquatoriais() => WebGl("coordenadas-equatoriais");

    [HttpGet("movimentos-da-terra")]
    public IActionResult MovimentosDaTerra() => WebGl("movimentos-da-terra");

    [HttpGet("calendario-gregoriano")]
    public IActionResult CalendarioGregoriano() => WebGl("calendario-gregoriano");

    [HttpGet("data-juliana")]
    public IActionResult DataJuliana() => WebGl("data-juliana");

    [HttpGet("posicao-sol")]
    public IActionResult PosicaoSol() => WebGl("posicao-sol");

    [HttpGet("posicao-lua")]
    public IActionResult PosicaoLua() => WebGl("posicao-lua");

    [HttpGet("eclipses")]
    public IActionResult Eclipses() => WebGl("eclipses");

    [HttpGet("equacao-de-kepler")]
    public IActionResult EquacaoDeKepler() => WebGl("equacao-de-kepler");

    [HttpGet("satelites-jupiter")]
    public IActionResult SatelitesJupiter() => WebGl("satelites-jupiter");

    [HttpGet("old-satelites-jupiter")]
    public IActionResult OldSatelitesJupiter() => WebGl("old-satelites-jupiter");

    [HttpGet("linhas-de-forca")]
    public IActionResult LinhasDeForca() => WebGl("linhas-de-forca");

    [HttpGet("magnetismo-terrestre")]
    public IActionResult MagnetismoTerrestre() => WebGl("magnetismo-terrestre");

    [HttpGet("grafico-globo")]
    public IActionResult GraficoGlobo([FromQuery(Name = "data")] string? conteudo)
    {
        ViewData[WebGlContentKey] = string.IsNullOrWhiteSpace(conteudo) ? GraficoDefault : conteudo;
        return View("webgl/grafico-globo/grafico-globo");
    }

    [HttpGet("holo-grafico-globo")]
    public IActionResult HoloGraficoGlobo([FromQuery(Name = "data")] string? conteudo)
    {
        ViewData[WebGlContentKey] = string.IsNullOrWhiteSpace(conteudo) ? GraficoDefault : conteudo;
        return View("webgl/holo-piramide/grafico-globo");
    }

    [HttpGet("holo-grafico-globo-2")]
    public IActionResult HoloGraficoGlobo2([FromQuery(Name = "data")] string? conteudo)
    {
        ViewData[WebGlContentKey] = string.IsNullOrWhiteSpace(conteudo) ? GraficoDefault : conteudo;
        return View("webgl/holo-piramide/grafico-globo-2");
    }

    [HttpGet("tabua-mares")]
    public async Task<IActionResult> TabuaMaresAsync(CancellationToken cancellationToken)
    {
        try
        {
            var options = await _tideTables.GetPortsAsync(cancellationToken);
            if (options is null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable);
            }

            return Ok(options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve tide table options.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    }

    [HttpGet("mares")]
    public async Task<IActionResult> MaresAsync(CancellationToken cancellationToken)
    {
        int? maxYear = null;
        try
        {
            maxYear = await _tideTables.GetLatestYearAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve tide table latest year.");
        }

        if (maxYear.HasValue)
        {
            ViewData["maxAnoTabuas"] = maxYear;
        }

        return WebGl("mares");
    }

    [HttpGet("tabua-mares/{tabuaMares}")]
    public async Task<IActionResult> TabuaMaresAsync(string tabuaMares, CancellationToken cancellationToken)
    {
        try
        {
            var tideTable = await _tideTables.GetTideTableAsync(tabuaMares, cancellationToken);
            if (tideTable is null)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable);
            }

            return Ok(tideTable);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve tide table {Tabua}.", tabuaMares);
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    }

    [HttpGet("orbitas")]
    public IActionResult Orbitas()
    {
        var orbitNames = LoadOrbitFileNames();
        var target = orbitNames.FirstOrDefault();

        if (string.IsNullOrEmpty(target))
        {
            _logger.LogWarning("No orbit JSON files were found under wwwroot/lib/on-daed-js/orbitas.");
            return NotFound();
        }

        return Redirect($"orbitas-{target}");
    }

    [HttpGet("orbitas-{orbita}")]
    public IActionResult Orbitas(string orbita)
    {
        var orbitNames = LoadOrbitFileNames();
        var selected = orbitNames.FirstOrDefault(name =>
            string.Equals(name, orbita, StringComparison.OrdinalIgnoreCase));

        if (string.IsNullOrEmpty(selected))
        {
            selected = orbitNames.FirstOrDefault();
        }

        if (string.IsNullOrEmpty(selected))
        {
            _logger.LogWarning("No orbit JSON files were found when resolving orbit '{Orbit}'.", orbita);
            return NotFound();
        }

        ViewData["arquivoDados"] = $"{selected}.json";
        return WebGl(OrbitasViewName);
    }

    [HttpGet("pdf/dados-magneticos.pdf")]
    public async Task<IActionResult> DadosMagneticosPdfAsync(
        [FromQuery(Name = "ano")] string ano,
        [FromQuery(Name = "tipo")] string tipo,
        CancellationToken cancellationToken)
    {
        try
        {
            var payload = await _magneticPdf.GeneratePdfAsync(ano, tipo, cancellationToken);
            const string contentType = "application/pdf";
            const string fileName = "dados-magneticos.pdf";
            return File(payload, contentType, fileName);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            _logger.LogWarning(ex, "Invalid request for magnetic PDF with year {Ano} and type {Tipo}.", ano, tipo);
            return BadRequest(new { error = ex.Message });
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogError(ex, "Magnetic PDF output not found.");
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Magnetic PDF generation failed.");
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error generating magnetic PDF.");
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    private IActionResult WebGl(string contentKey)
    {
        ViewData[WebGlContentKey] = contentKey;
        ViewData["WebGlCss"] = ApplyInlineExpressions(LoadTemplateFragment($"webgl/{contentKey}/css"));
        ViewData["WebGlAjuda"] = ApplyInlineExpressions(LoadTemplateFragment($"webgl/{contentKey}/ajuda"));
        ViewData["WebGlSobre"] = ApplyInlineExpressions(LoadTemplateFragment($"webgl/{contentKey}/sobre"));
        ViewData["WebGlConteudo"] = ApplyInlineExpressions(LoadTemplateFragment($"webgl/{contentKey}/conteudo"));
        ViewData["WebGlCreditos"] = ApplyInlineExpressions(_creditosFragment ?? string.Empty);
        return View(WebGlViewName);
    }

    private IReadOnlyList<string> LoadOrbitFileNames()
    {
        var directory = _webRootFiles.GetDirectoryContents("lib/on-daed-js/orbitas");
        if (!directory.Exists)
        {
            return Array.Empty<string>();
        }

        return directory
            .Where(file => !file.IsDirectory && file.Name.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            .Select(file => Path.GetFileNameWithoutExtension(file.Name))
            .Where(name => !string.Equals(name, "referencia", StringComparison.OrdinalIgnoreCase))
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private string? LoadTemplateFragment(string relativePath)
    {
        if (relativePath.StartsWith("/", StringComparison.Ordinal))
        {
            relativePath = relativePath.TrimStart('/');
        }

        return _resolver.Resolve(relativePath);
    }

    private string ApplyInlineExpressions(string? content)
    {
        if (string.IsNullOrEmpty(content))
        {
            return string.Empty;
        }

        return Regex.Replace(content, @"\[\[\$\{([^}]+)\}\]\]", match =>
        {
            var key = match.Groups[1].Value.Trim();
            if (ViewData.TryGetValue(key, out var value) && value is not null)
            {
                return value.ToString() ?? string.Empty;
            }

            return string.Empty;
        });
    }
}
