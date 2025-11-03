using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Astro.Domain.Ocean;

public sealed class TabuaMare
{
    public IList<TideTableEntry> Entradas { get; } = new List<TideTableEntry>();
    public string? Nome { get; set; }
    public string? Fuso { get; set; }
    public string? Latitude { get; set; }
    public string? Longitude { get; set; }
    public string? Instituicao { get; set; }
    public string? Componentes { get; set; }
    public string? NivelMedio { get; set; }
    public string? Ano { get; set; }
    public string? Carta { get; set; }

    [JsonPropertyName("totalPrevisoes")]
    public int TotalPrevisoes => Entradas.Sum(e => e.HoraAltura.Count);
}
