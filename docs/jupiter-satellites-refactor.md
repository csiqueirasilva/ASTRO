# Satélites de Júpiter – Arquitetura Atual e Roteiro de Migração

Última atualização: 2025‑11‑03

Este documento descreve em detalhes como a página **/satelites-jupiter** funciona hoje e quais pontos precisarão ser tocados para migrar o cálculo das posições para um engine analítico (por exemplo, Stellarium Web SDK) sem perder as funcionalidades existentes.

---

## 1. Fontes de dados atuais

| Origem | Endpoint / Arquivo | Uso |
| --- | --- | --- |
| Eventos mensais | `lib/jupiter-satellite-events-json/export/<ano>.json` | Tabela de eclipses/ocultações/trânsitos consumida por tooltips, PDF e CSV |
| Estados instantâneos | `/horizons/jupiter-satellites-model?jd=...` | Vectores do Sol, Io, Europa, Ganímedes, Calisto e Terra para o **primeiro dia do mês selecionado** |
| Utilitários | Scripts `ON_DAED` (tempo sideral, conversões, worker 3D, etc.) | Conversões astronômicas, formatações, bootstrap do Three.js, geração de PDFs |

- O serviço `/horizons/jupiter-satellites-model` devolve exatamente o JSON que era entregue pelo CGI do JPL (posições em AU, velocidades em AU/dia).
- Depois da primeira carga, **toda a evolução temporal é calculada no navegador**. Novas chamadas ao backend só ocorrem quando o usuário muda o mês.

---

## 2. Stack Three.js / `ON_DAED["3D"]`

### 2.1 `JupiterSatellites` (`lib/on-daed-js/3D/JupiterSatelites.js`)

- Wrapper `this.wrapper` rotacionado `π/2` → plano X/Z vira plano de visualização.
- Objetos principais:
  - `JupiterModelBody` para cada satélite + Terra (toy model kepleriano circular).
  - `DirectionalLight` + sol mesh texturizado (`addSun()`).
  - `PhysWrapperTrace` para trilhas orbitais.
- Métodos chave:
  - `updateFromData(posData)` – armazena os vetores do backend e atualiza o sol/terra.
  - `traceLines(t)` – gera trilhas ±5 unidades em passos de `TRACE_V_STEP`.
  - `setSunCameraPos()` / `setEarthCameraPos()` – reposicionam a câmera.
  - `setCameraDataCallback()` – injeta callback usado ao travar a câmera na Terra.

### 2.2 `JupiterModelBody`

- Atributos de orbitais fixos (raio, período, inclinação) codificados em km/AU.
- `vectorToParametric(x,y,z)`:
  - Salva fase inicial `atan2(y, x)`.
  - Posiciona a mesh em `(x, 0, y)` (note o swap dos eixos).
- `setPositionByT(t)`:
  - Calcula `bufT = (t / period) * 2π`.
  - Orbitas **perfeitamente circulares**, sem excentricidade.
  - Aplica rotação em torno de Z para simular inclinação orbital.
- Resultado: o backend só corrige a **fase inicial**; o raio/orientação permanecem fixos.

### 2.3 `PhysWrapperTrace`

- Mantém uma lista de `Line` (Three.js) com `nVerts` = 500.
- `traceLines(oT)` percorre `t ∈ [-5,+5]` deslocando o trace wrapper de `TRACE_V_STEP * 20` por loop.
- Cada iteração chama `JupiterModelBody.setPositionByT` → o traço segue o **modelo paramétrico**, não os vetores reais.

---

## 3. UI e fluxo de interação (`conteudo.html`)

| Elemento | Responsabilidade |
| --- | --- |
| `#slider-data` | Controla a data/hora (multiplicador `sliderFact = 1e8`). Eventos `slide` e `slideStop` recalculam `t`, atualizam o display e chamam `traceLines`. |
| `fetchTimeData(mes, ano, callback)` | 1) Carrega JSON de eventos do ano. 2) Chama `/horizons/jupiter-satellites-model` com JD do dia 1. 3) `updateFromData` e reabilita slider. |
| `setModelDate(...)` | Seta data/hora informada na UI, dispara `traceLines`, bloqueia/ desbloqueia loading. |
| Botões | - Ligar/desligar órbitas (toggle `tracer.visible`).<br> - Travar/destravar câmera na Terra (usa `cameraLocked`).<br> - Play/pause (auto-avança slider).<br> - Exportar eventos (gera PDF via jsPDF). |
| Tooltips e modal | Usam `timeDataFromJulian(jd)` que filtra eventos visíveis considerando latitude/longitude e cálculo de trânsitos (`ON_DAED.ASTRO.getTransit`). |
| PDF (`printPDF`) | Renderiza HTML dos eventos, inclui screenshot do canvas principal. |

---

## 4. Limitações Observadas

1. **Modelo Orbital Simplificado** – As órbitas desenhadas são círculos fixos; o backend só define um deslocamento de fase. Qualquer desvio real (resonância Io‑Europa‑Ganímedes, excentricidades, inclinações) é ignorado. Por isso, trocar o dataset de 6 h para 1 h não corrige a ordem relativa ou a forma das trajetórias.
2. **Trilhas** – Baseadas no mesmo modelo circular; não representam a curva real promovida por Horizons.
3. **Sun/Earth** – Vetores do backend são usados diretamente, mas o referencial depende da rotação da wrapper. Ajustes errados nos eixos (como a tentativa de projetar em plano do céu) quebram iluminação e posicionamento.
4. **Eventos** – Continuam dependentes dos JSONs pré-computados. Qualquer alteração na fonte dos efemérides precisa preservar esses contratos (IDs de satélite, nomes, etc.).

---

## 5. Impacto na Migração para Stellarium (ou Solver Analítico)

Para substituir o cálculo por um solver frontend (Stellarium Web SDK ou similar) sem perder a UI:

1. **Ingestão de estados**
   - Precisamos gerar arrays de posição/velocidade em eixos compatíveis com o motor atual (`(x,0,y)` em km/AU para as meshes).
   - A resposta pode seguir o mesmo formato do `/horizons/jupiter-satellites-model` para evitar tocar no resto do código.

2. **Reposicionar meshes com dados reais**
   - Reescrever `JupiterModelBody` para aceitar vetores completos por frame (em vez de `setPositionByT`).
   - Provavelmente manterá apenas o `initMesh`/`circleSelection`.

3. **Trilhas com dados reais**
   - Modificar `PhysWrapperTrace` (ou um wrapper) para alimentar um histórico de pontos reais (±15 dias). Pode ser feito em worker.
   - Precisamos gerar uma série de amostras por linha (consumo de CPU/GPU a ser avaliado).

4. **Luz e câmera**
   - Assim que as posições vierem do solver, garantir que os eixos/vetores sejam rotacionados igual ao modelo anterior (respeitando a rotação `π/2` da wrapper).

5. **Eventos, PDF, CSV**
   - Continuar usando o JSON legado **ou** migrá-lo para o novo solver em um segundo momento. O backend/worker deve expor uma API compatível para não quebrar `timeDataFromJulian`.

---

## 6. Próximos Passos (proposta)

1. **Isolar versão atual**
   - Copiar `satelites-jupiter/` para `old-satelites-jupiter/` e expor rota `/old-satelites-jupiter` para referência futura.

2. **Scaffolding da versão nova**
   - Criar página/JS novos (`satelites-jupiter-v2`), mantendo a mesma estrutura HTML para os modais, slider e botões.
   - Introduzir um Web Worker (`lib/on-daed-js/workers/satelites-jupiter-worker.js`) como fachada para o solver analítico; mensagens `initialize`, `computeSamples` e `samples` já estão definidas e, a partir da rota `GET /horizons/jupiter-satellites-track`, já retornam amostras reais (Sun + luas + Terra) em intervalos configuráveis.

3. **Implementar novas trilhas/aparências**
   - Substituir `JupiterModelBody` para consumir vetores reais.
   - Adicionar lógica de geração de trilhas com base em dados históricos (worker para ±15 dias).

4. **Testes/Paridade**
   - Reescrever `TemplateParityTests` para apontar para a nova página, adicionando testes específicos para a ordem dos satélites e validação de estados (comparar com Stellarium/Horizons).

5. **Documentação**
   - Atualizar `docs/wiki/03-Documentacao-Tecnica-do-Projeto.md` e `docs/routes-and-contracts.md` assim que a nova página estiver funcional.

## 7. Análise de Paridade (situação atual)

A página *v2* ainda é apenas um *scaffold* (preview 2D em `<canvas>`). A comparação com a versão legada evidencia os seguintes itens em aberto:

| Área | Versão Legada | Situação Atual (v2) | Ação necessária |
| --- | --- | --- | --- |
| **Renderização principal** | Cena Three.js em tela cheia (`ON_DAED["3D"]`), texturas, malhas, iluminação, giroscópio | Canvas 2D placeholder (sem meshes, iluminação ou plano inclinado) | Portar cena para Three.js, consumir vetores reais, restaurar rotação `π/2`, texturas, luz direcional e OrbitControls |
| **Posicionamento** | Coordenadas adaptadas ao plano do céu com offsets; círculos paramétricos para trilhas | Dados crus em AU projetados diretamente, sem transformação, sem trilhas | Implementar transformação de referenciais (barycentric → wrapper), gerar trilhas ±15 dias com histórico vindo do worker |
| **Controles UI** | Botões “Configurar Data e Local”, “Exportar eventos”, “Desligar órbitas”; slider + autoplay; foco na Terra | Ausentes (exceto botão “Verificar progresso”) | Reaproveitar layout antigo, encaixar novos handlers com base no worker (slider/tempos, câmera lock, toggles) |
| **Eventos** | Tooltip diário, listagem mensal, PDF & CSV, filtros por horário local | Ainda não implementado | Continuar usando JSON legado (ou gerar equivalente via solver); reintroduzir `timeDataFromJulian`, `printPDF`, `CSV` |
| **Câmera** | OrbitControls, modos “vista livre”/“vista da Terra”, geolocalização inicial | Não implementado | Reaplicar lógica atual (geolocalização, `setSunCameraPos`, `cameraLocked`) sobre nova cena Three.js |
| **Motor de Worker** | N/A | Worker já consulta `/horizons/jupiter-satellites-track` | Ampliar para suportar span dinâmico, granularidade, transformação e pré-processamento (e.g. amostragem densa para trilhas) |
| **Testes/Paridade** | `TemplateParityTests` ainda comparando com `/old-satelites-jupiter` | Paridade futura | Atualizar/expandir depois que a nova página alcançar funcionalidade completa |

### Estratégia recomendada

1. **Construir cena Three.js mínima** reusando `ON_DAED["3D"].create`, mas alimentando as meshes com os vetores do worker (mesmo que sem trilhas inicial). Garantir eixos corretos e iluminação.
2. **Gerar trilhas reais**: worker calcula histórico ±15 dias; front acumula pontos em `BufferGeometry` ou adaptação do `PhysWrapperTrace` para dados reais.
3. **Portar UI**: trazer controles (modal, slider, play/pause, foco Terra, botões de relatório) para o novo JS, ligando-os aos dados do worker.
4. **Restaurar eventos**: reutilizar funções `timeDataFromJulian`, `printPDF`, CSV; avaliar se permanecem em JSON legado ou se devem ser recalculados via solver.
5. **Paridade visual**: após a cena refletir o layout antigo, atualizar `TemplateParityTests` e adicionar novos testes para a API de trilhas.

---

## 8. Plano de Transformação de Coordenadas (2025‑11‑04)

- **Origem dos vetores** – O endpoint `/horizons/jupiter-satellites-track` já devolve o Sol, as luas e a Terra em coordenadas jupiter‑cêntricas (km convertidos para UA). Não precisamos subtrair novamente a posição de Júpiter no frontend; basta aplicar a rotação do wrapper (`rotation.x = π/2`) e o mapeamento `(x, -z, y)` para alinhar o “plano do céu” como na versão legado.
- **Escala** – O fator `UNIT = 1/18216` continua válido. Multiplicar as coordenadas em UA por `EARTH_ORBIT_RADIUS * UNIT` reproduz a escala dos modelos paramétricos antigos, preservando o tamanho relativo das texturas existentes.
- **Trilhas reais** – Cada resposta inclui `samples[]` ordenado por tempo. Vamos armazenar os pontos por satélite e gerar uma `BufferGeometry` dedicada para desenhar as linhas com base nas posições reais. O botão “Desligar órbitas” simplesmente alternará a visibilidade dessas geometrias.
- **Câmera e iluminação** – O vetor solar seguirá normalizado para posicionar a `DirectionalLight`, como no código legado. A Terra continua a usar o mesmo mapeamento, permitindo os modos de câmera “livre”, “vista da Terra” e “vista do Sol”.
- **Próximos passos** – Implementar a hidratação dessas trilhas no frontend (`JupiterSatellitesV2`), conectando o slider aos índices das amostras e reaproveitando `ON_DAED.formatarDataJuliana` para atualizar a UI. Assim que os traços estiverem corretos, retomaremos a porta das demais interações (modal de localização, eventos, exportações).

---

Este documento deve acompanhar o projeto enquanto a migração estiver em andamento. Ajustes adicionais, medições de performance e decisões sobre os datasets (ex.: abrangência 2000‑2100, passo de 1h) podem ser registrados como seções extras aqui.
