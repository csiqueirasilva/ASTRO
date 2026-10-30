using System.IO;
using Astro.Domain.Services;
using Astro.Web.Services;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddSingleton<IMagneticPdfService, CliMagneticPdfService>();
builder.Services.AddSingleton<IJovianEphemerisService, LocalJovianEphemerisService>();
builder.Services.AddHealthChecks()
    .AddCheck("magnetic-generator", DependencyHealthChecks.MagneticGenerator)
    .AddCheck("dislin-library", DependencyHealthChecks.DislinLibrary)
    .AddCheck("jovian-ephemeris", DependencyHealthChecks.JovianEphemeris)
    .AddCheck("templates", () => DependencyHealthChecks.Templates(builder.Environment.ContentRootPath));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 2;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

var legacyStaticPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "src", "main", "resources", "static"));
IFileProvider staticProvider = app.Environment.WebRootFileProvider;

if (Directory.Exists(legacyStaticPath))
{
    var legacyProvider = new PhysicalFileProvider(legacyStaticPath);
    staticProvider = new CompositeFileProvider(staticProvider, legacyProvider);
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseForwardedHeaders();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = staticProvider,
    ServeUnknownFileTypes = true,
    DefaultContentType = "application/octet-stream"
});
app.UseAntiforgery();

app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = (context, report) => context.Response.WriteAsJsonAsync(new
    {
        status = report.Status.ToString(),
        checks = report.Entries.Select(e => new { name = e.Key, status = e.Value.Status.ToString(), description = e.Value.Description })
    })
});

app.Run();
