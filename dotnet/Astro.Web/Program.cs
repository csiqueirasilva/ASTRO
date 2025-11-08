using System.IO;
using Astro.Domain.Services;
using Astro.Web.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpClient<ITideTableService, HtmlTideTableService>();
builder.Services.AddSingleton<IMagneticPdfService, CliMagneticPdfService>();
builder.Services.AddSingleton<IJovianEphemerisService, LocalJovianEphemerisService>();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 2;
    options.KnownNetworks.Clear();
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

app.Run();
