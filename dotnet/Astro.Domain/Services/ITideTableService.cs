using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Astro.Domain.Ocean;

namespace Astro.Domain.Services;

public interface ITideTableService
{
    Task<IReadOnlyCollection<PortoData>?> GetPortsAsync(CancellationToken cancellationToken);
    Task<int?> GetLatestYearAsync(CancellationToken cancellationToken);
    Task<TabuaMare?> GetTideTableAsync(string identifier, CancellationToken cancellationToken);
}
