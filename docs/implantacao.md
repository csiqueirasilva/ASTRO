# Implantação do ASTRO em produção

Guia para a equipe que opera o ASTRO em produção. A aplicação roda em **um contêiner**, sem banco de dados, sem segredos e **sem acesso à internet em tempo de execução**.

## Imagem

- Definida em `devops/Dockerfile`. Base `mcr.microsoft.com/dotnet/aspnet:10.0` (Ubuntu 24.04).
- Já inclui o gerador das cartas magnéticas (Fortran + DISLIN) e os dados dos satélites de Júpiter. Nada precisa ser instalado no servidor além do Docker.
- Tamanho: ~750 MB.
- Construção e subida a partir do repositório:

  ```bash
  git clone --recurse-submodules https://github.com/csiqueirasilva/ASTRO.git
  cd ASTRO/devops
  docker compose up -d --build
  ```

## Porta

- `8080/tcp` dentro do contêiner, em HTTP.
- Deve ficar acessível **somente para o proxy reverso** (ex.: `127.0.0.1:16160:8080`). A aplicação confia nos cabeçalhos `X-Forwarded-*` que recebe, então a porta 8080 não deve ficar exposta diretamente.

## Variáveis de ambiente

| Variável | Valor | Observação |
| --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Obrigatória. Desliga páginas de erro detalhadas e liga HSTS. |
| `ASPNETCORE_URLS` | `http://+:8080` | Padrão da imagem; não precisa ser alterada. |
| `Logging__LogLevel__Default` | `Information` | Opcional (`Warning` reduz o volume de log). |

## Volume

- `astro-data-protection` → `/root/.aspnet/DataProtection-Keys`. Guarda as chaves de proteção de dados do ASP.NET entre reinícios. Ocupa poucos KB.

## Saúde e verificação pós-incidente

- `GET /health` responde `200` (saudável) ou `503` (falha), com JSON por item:

  ```json
  {"status":"Healthy","checks":[
    {"name":"magnetic-generator","status":"Healthy"},
    {"name":"dislin-library","status":"Healthy"},
    {"name":"jovian-ephemeris","status":"Healthy"},
    {"name":"templates","status":"Healthy"}]}
  ```

- Verifica: gerador das cartas presente e executável, biblioteca gráfica DISLIN, dados de Júpiter e templates. Não gera PDF a cada chamada (custo < 1 ms), pode ser consultado pelo monitoramento.
- A imagem tem `HEALTHCHECK` do Docker (a cada 30 s; `unhealthy` após 3 falhas).
- Teste funcional completo, para checklist pós-incidente: `GET /pdf/dados-magneticos.pdf?ano=2020&tipo=1` deve retornar `200` com um PDF (~500 KB, ~0,2 s).

## Recursos

Medido em Intel i5-13600KF:

| Situação | Memória | Observação |
| --- | --- | --- |
| Parado, após subir | ~130 MB | sobe em < 1 s |
| Uso normal (todas as páginas) | ~150 MB | páginas em ~1 ms |
| Uma carta magnética | +2 MB | ~0,2 s, ~0,3 s de CPU |
| 100 cartas simultâneas, limite 2 CPU / 512 MB | pico 335 MB | ~15 s, sem falhas |

- **Recomendado:** 2 CPUs e 512 MB. **Mínimo:** 1 CPU e 384 MB.
- **Disco:** ~1,5 GB (imagem atual + uma versão anterior para rollback) e espaço para logs.

## Configuração recomendada (compose)

```yaml
services:
  astro-web:
    # build/imagem conforme devops/docker-compose.yml
    environment:
      ASPNETCORE_ENVIRONMENT: Production
    ports:
      - "127.0.0.1:16160:8080"
    restart: unless-stopped
    cpus: 2
    mem_limit: 512m
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: "3"
    volumes:
      - astro-data-protection:/root/.aspnet/DataProtection-Keys
```

## Proxy reverso e HTTPS

A publicação na internet fica a cargo da infraestrutura do ON:

- proxy reverso (nginx, Apache, Traefik, Caddy...) na frente do contêiner, terminando o HTTPS;
- certificado com renovação automática (ex.: Certbot / Let's Encrypt);
- encaminhar `X-Forwarded-For` e `X-Forwarded-Proto`;
- sugerido: limite de requisições em `/pdf/` (cada carta abre um processo do gerador) e, se desejado, restringir `/health` à rede do monitoramento.

O ASTRO funciona sob subcaminho (ex.: `https://daed.on.br/astro/`) desde que o proxy remova o prefixo. Exemplo nginx, testado:

```nginx
location = /astro { return 301 /astro/; }
location /astro/ {
    proxy_pass http://127.0.0.1:16160/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Rede

- Nenhuma chamada externa em tempo de execução: a saída do contêiner para a internet pode ficar bloqueada.

## Atualização e rollback

1. Obter a nova versão (`git pull` + `docker compose up -d --build`, ou a imagem versionada, quando houver pipeline).
2. Conferir `GET /health` = `200` e gerar uma carta de teste.
3. Em caso de problema, voltar para a versão anterior e subir de novo.
