using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Astro.Domain.Services;
using Microsoft.Extensions.Logging;

namespace Astro.Web.Services;

public sealed class CliMagneticPdfService : IMagneticPdfService
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.Ordinal) { "1", "2", "3" };
    private const double MinYear = 1900.0;
    private const double MaxYear = 2030.0;
    private const string ExecutablePath = "/opt/declinacao-magnetica/gerar";
    private const string LibraryPath = "/usr/local/dislin";
    private const string OutputFileName = "dislin.pdf";

    private readonly ILogger<CliMagneticPdfService> _logger;

    public CliMagneticPdfService(ILogger<CliMagneticPdfService> logger)
    {
        _logger = logger;
    }

    public async Task<byte[]> GeneratePdfAsync(string ano, string tipo, CancellationToken cancellationToken)
    {
        ValidateInputs(ano, tipo);

        var workingDirectory = CreateTemporaryDirectory();

        try
        {
            await RunGeneratorAsync(ano, tipo, workingDirectory, cancellationToken);

            var outputPath = Path.Combine(workingDirectory, OutputFileName);
            if (!File.Exists(outputPath))
            {
                throw new FileNotFoundException($"DISLIN output was not produced at '{outputPath}'.", outputPath);
            }

            return await File.ReadAllBytesAsync(outputPath, cancellationToken);
        }
        finally
        {
            TryDeleteDirectory(workingDirectory);
        }
    }

    private static void ValidateInputs(string ano, string tipo)
    {
        if (!double.TryParse(ano, NumberStyles.Float, CultureInfo.InvariantCulture, out var anoDouble))
        {
            throw new ArgumentOutOfRangeException(nameof(ano), ano, "Ano inválido para geração magnética.");
        }

        if (anoDouble < MinYear || anoDouble > MaxYear)
        {
            throw new ArgumentOutOfRangeException(nameof(ano), ano, $"Ano deve estar entre {MinYear} e {MaxYear}.");
        }

        if (!AllowedTypes.Contains(tipo))
        {
            throw new ArgumentOutOfRangeException(nameof(tipo), tipo, "Tipo inválido para geração magnética.");
        }
    }

    private static string CreateTemporaryDirectory()
    {
        var basePath = Path.GetTempPath();
        string targetPath;

        do
        {
            var folder = $"dislin-{Guid.NewGuid():N}";
            targetPath = Path.Combine(basePath, folder);
        } while (Directory.Exists(targetPath));

        Directory.CreateDirectory(targetPath);
        return targetPath;
    }

    private async Task RunGeneratorAsync(string ano, string tipo, string workingDirectory, CancellationToken cancellationToken)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = ExecutablePath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            WorkingDirectory = workingDirectory
        };

        startInfo.ArgumentList.Add(ano);
        startInfo.ArgumentList.Add(tipo);
        startInfo.Environment["LD_LIBRARY_PATH"] = LibraryPath;

        _logger.LogInformation("Starting DISLIN generator with args {Ano} {Tipo} in {Directory}.", ano, tipo, workingDirectory);

        using var process = new Process { StartInfo = startInfo };

        try
        {
            if (!process.Start())
            {
                throw new InvalidOperationException("Failed to start DISLIN generator.");
            }
        }
        catch (Exception ex) when (ex is Win32Exception or InvalidOperationException)
        {
            throw new InvalidOperationException("Could not launch the DISLIN generator process.", ex);
        }

        var stdoutTask = PipeStreamAsync(process.StandardOutput, line => _logger.LogInformation("DISLIN: {Line}", line), cancellationToken);
        var stderrTask = PipeStreamAsync(process.StandardError, line => _logger.LogWarning("DISLIN ERR: {Line}", line), cancellationToken);

        await process.WaitForExitAsync(cancellationToken);
        await Task.WhenAll(stdoutTask, stderrTask);

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException($"DISLIN generator exited with code {process.ExitCode}.");
        }

        _logger.LogInformation("DISLIN generator completed successfully.");
    }

    private static async Task PipeStreamAsync(StreamReader reader, Action<string> log, CancellationToken cancellationToken)
    {
        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (!string.IsNullOrEmpty(line))
            {
                log(line);
            }
        }
    }

    private void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete temporary DISLIN directory {Path}.", path);
        }
    }
}
