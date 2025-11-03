using System.Collections.Generic;

namespace Astro.Domain.Ocean;

public sealed class TideTableEntry
{
    public IDictionary<string, string> HoraAltura { get; } = new Dictionary<string, string>();
    public string? Lua { get; set; }
    public string? Dia { get; set; }
}
