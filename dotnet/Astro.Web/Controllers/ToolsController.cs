using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace Astro.Web.Controllers;

[Route("csv")]
public class ToolsController : Controller
{
    [HttpPost]
    public IActionResult Csv([FromForm] string titulos, [FromForm] string corpo)
    {
        var builder = new StringBuilder();
        if (!string.IsNullOrEmpty(titulos))
        {
            builder.Append(titulos);
        }

        builder.AppendLine();

        if (!string.IsNullOrEmpty(corpo))
        {
            builder.Append(corpo);
        }

        var bytes = Encoding.UTF8.GetBytes(builder.ToString());
        return File(bytes, "text/csv", "export.csv");
    }
}
