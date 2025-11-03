using System.Threading;
using System.Threading.Tasks;

namespace Astro.Domain.Services;

public interface IMagneticPdfService
{
    Task<byte[]> GeneratePdfAsync(string ano, string tipo, CancellationToken cancellationToken);
}
