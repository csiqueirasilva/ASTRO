import os
import shutil
from bs4 import BeautifulSoup, NavigableString
import textwrap

ROOT = "/app"
TEMPLATES = os.path.join(ROOT, "src", "main", "resources", "templates")
STATIC_ROOT = os.path.join(ROOT, "src", "main", "resources", "static")
WIKI_ROOT = os.path.join(ROOT, "docs", "wiki")
MANUAL_PREFIX = "manual-"
CENARIO_PREFIX = "cenarios-"
ASSETS_ROOT = os.path.join(WIKI_ROOT, "assets")

for name in os.listdir(WIKI_ROOT):
    if name.startswith(MANUAL_PREFIX) and name.endswith(".md"):
        os.remove(os.path.join(WIKI_ROOT, name))
    if name.startswith(CENARIO_PREFIX) and name.endswith(".md"):
        os.remove(os.path.join(WIKI_ROOT, name))

if os.path.isdir(ASSETS_ROOT):
    shutil.rmtree(ASSETS_ROOT)
os.makedirs(ASSETS_ROOT, exist_ok=True)

modules = [
    {
        "slug": "posicao-sol",
        "title": "Posição do Sol",
        "category": "Posição",
        "positive": "Marina, professora de geografia do ensino médio, planeja uma aula sobre as estações do ano. Na véspera ela abre o módulo Posição do Sol, configura a localização da escola e percorre os solstícios e equinócios, anotando as alturas solares exibidas no painel. Em sala, os alunos repetem o movimento e relacionam a trajetória aparente às variações de clima observadas em sua cidade.",
        "negative": "No laboratório de informática ainda existem computadores com navegadores antigos que não suportam WebGL. Quando um estudante tenta abrir o módulo, recebe apenas o aviso de ausência de suporte e nenhuma cena é renderizada. A equipe pedagógica agenda a atividade para um espaço com máquinas atualizadas enquanto providencia a atualização dos navegadores."},
    {
        "slug": "posicao-lua",
        "title": "Posição da Lua",
        "category": "Posição",
        "positive": "O clube de astronomia da universidade organiza uma vigília lunar. Fernanda, responsável pelo encontro, informa a data e a localização do observatório e utiliza o módulo para prever a altura e a fase da Lua durante cada hora da noite. Ela exporta as capturas de tela e monta um roteiro para os participantes acompanharem o nascer e o ápice do astro.",
        "negative": "Durante uma observação em campo, o grupo depende de um hotspot de celular com sinal fraco. Sem conseguir sincronizar as efemérides, o módulo permanece com dados desatualizados e não reflete a posição correta da Lua. A equipe faz anotações manuais e, ao retornar à área urbana, repete o procedimento para registrar as informações oficiais."},
    {
        "slug": "eclipses",
        "title": "Eclipses Solar e Lunar",
        "category": "Posição",
        "positive": "Cláudio, aluno do ensino técnico, está curioso sobre o eclipse solar que ocorrerá no próximo semestre. Ele abre o módulo, navega pela linha do tempo até a data do evento e observa como a sombra percorre o globo. Ao combinar o mapa com a visualização lateral, entende por que sua cidade verá apenas um eclipse parcial e compartilha essa informação com a turma.",
        "negative": "Uma usuária tenta simular eclipses para datas muito distantes, além do intervalo coberto pelos modelos. O sistema exibe mensagem informando que não há dados para aquela data e sugere consultar eventos registrados. Ela anota a limitação para planejar futuras extensões do conteúdo em sala."},
    {
        "slug": "satelites-jupiter",
        "title": "Satélites de Júpiter",
        "category": "Posição",
        "positive": "Renato, astrônomo amador, pretende fotografar trânsitos de Io e Europa. Com o módulo, ele carrega os eventos do mês, fixa sua latitude e acompanha o movimento dos satélites em 3D, ativando e desativando órbitas conforme necessário. Depois gera o PDF com horários críticos e leva o roteiro para o observatório.",
        "negative": "Em uma viagem para uma área remota sem internet, Renato tenta carregar novamente os dados e recebe a mensagem de erro por não conseguir baixar a tabela anual. Ele decide utilizar o PDF baixado anteriormente e registra que, para uso offline, é essencial realizar o download antecipado dos eventos."},
    {
        "slug": "equacao-de-kepler",
        "title": "Equação de Kepler",
        "category": "Posição",
        "positive": "Na aula de mecânica celeste, o professor Daniel demonstra como a excentricidade influencia a solução da Equação de Kepler. Ele ajusta o parâmetro, observa o gráfico atualizado e pede aos alunos que comparem o tempo gasto próximo ao periélio e ao afélio. A atividade gera debate sobre a segunda lei de Kepler e o uso de métodos iterativos.",
        "negative": "Um estudante curioso tenta inserir excentricidade maior que 1 para simular uma órbita parabólica. O módulo acusa valor inválido e não traça o gráfico até que o parâmetro seja corrigido, ressaltando que o simulador foi concebido apenas para órbitas elípticas."},
    {
        "slug": "linhas-de-forca",
        "title": "Linhas de Força",
        "category": "Elementos Terrestres",
        "positive": "No laboratório de física, a professora Joana utiliza o simulador para explicar a magnetosfera terrestre. Ela gera cartas magnéticas do Brasil, aciona a simulação do vento solar e pede que os alunos observem como o campo se distorce. Em seguida, solicita que exportem o gráfico em PDF para o relatório de aula.",
        "negative": "Um técnico tenta gerar a carta magnética em um servidor recém-instalado, mas o download falha pela ausência das bibliotecas `libgfortran5` e `libquadmath0`. O registro de log orienta a instalar as dependências antes de repetir a operação, evidenciando uma limitação bem documentada do módulo."},
    {
        "slug": "magnetismo-terrestre",
        "title": "Magnetismo Terrestre",
        "category": "Elementos Terrestres",
        "positive": "Durante a semana de ciência, alunos do 9.º ano comparam declinação e intensidade magnética em capitais brasileiras. Eles ajustam a data, clicam em pontos específicos do mapa e registram não apenas os valores, mas também as unidades exibidas (graus e nano Tesla). O professor complementa a atividade com o vídeo sobre correção da bússola.",
        "negative": "Em um tablet antigo, o navegador fecha a aba ao carregar o mapa completo de declinação por falta de memória. A equipe reduz o zoom e desativa temporariamente os painéis para aliviar o consumo, reforçando que equipamentos mais robustos oferecem melhor experiência."},
    {
        "slug": "mares",
        "title": "Marés",
        "category": "Elementos Terrestres",
        "positive": "Uma equipe de biologia marinha planeja trabalho de campo em Fernando de Noronha. Eles selecionam o porto, definem o período de observação e exportam o PDF com a tábua completa. As informações orientam o cronograma de coletas, evitando horários de maré alta perigosos para desembarque.",
        "negative": "Durante a expedição, o grupo tenta atualizar os dados via notebook sem conexão ativa e recebe aviso de indisponibilidade. Eles recorrem ao PDF baixado previamente e anotam que, para regiões sem internet, o material deve ser salvo com antecedência."},
    {
        "slug": "movimentos-da-terra",
        "title": "Movimentos da Terra",
        "category": "Esfera Celeste",
        "positive": "Alunos de astronomia manipulam o módulo para visualizar rotação, translação e precessão. Ao alternar camadas e acelerar o tempo, percebem como a orientação do eixo terrestre varia ao longo dos milênios e discutem impactos em coordenadas celestes.",
        "negative": "Se o controle do laboratório desabilita WebGL para economizar recursos, o módulo exibe apenas os textos sem renderizar a cena. O responsável precisa habilitar o recurso ou usar equipamentos compatíveis para que os alunos aproveitem o simulador."},
    {
        "slug": "obliquidade-da-ecliptica",
        "title": "Obliquidade da Eclíptica",
        "category": "Esfera Celeste",
        "positive": "Em um curso de climatologia, a professora Luciana demonstra como a obliquidade da eclíptica influencia a insolação em diferentes latitudes. Ela ajusta o painel de datas, lê os textos explicativos e conduz debate sobre ciclos de Milankovitch.",
        "negative": "Alguns alunos utilizam navegadores que bloqueiam pop-ups por padrão. O modal de coordenadas não aparece e eles não conseguem alterar parâmetros até permitir a abertura de janelas, evidenciando uma dependência da configuração do navegador."},
    {
        "slug": "angulo-horario",
        "title": "Ângulo Horário",
        "category": "Esfera Celeste",
        "positive": "O clube de observação noturna de uma escola técnica registra ascensão reta e declinação de estrelas. Ao inserir as coordenadas locais e ajustar data e hora, o módulo apresenta o ângulo horário, permitindo planejar observações no meridiano.",
        "negative": "Quando alunos digitam horas fora do intervalo 0–23 ou minutos negativos, o sistema destaca o campo em vermelho e solicita correção. A experiência reforça a importância de validar dados antes de executar os cálculos."},
    {
        "slug": "coordenadas-equatoriais",
        "title": "Coordenadas Equatoriais",
        "category": "Transformação de Coordenadas",
        "positive": "No observatório da universidade, um grupo converte coordenadas horizontais registradas em campo para o sistema equatorial a fim de gerar um catálogo. Eles utilizam o formulário, processam os resultados e integram os valores ao software de apontamento do telescópio.",
        "negative": "Quando um aluno cola texto contendo letras nos campos numéricos, o botão “Visualizar” acusa erro e nenhuma conversão é realizada. O aviso orienta a revisar o preenchimento, esclarecendo os limites da ferramenta."},
    {
        "slug": "coordenadas-horizontais",
        "title": "Coordenadas Horizontais",
        "category": "Transformação de Coordenadas",
        "positive": "Um grupo de trilheiros aprende a interpretar mapas celestes noturnos. Eles inserem ascensão reta e declinação de objetos de interesse e obtêm azimute e altura para o acampamento, antecipando os horários de melhor visibilidade.",
        "negative": "Ao deixar latitude ou longitude em branco, o sistema não conclui a conversão e exibe mensagem pedindo o preenchimento dos campos obrigatórios. O incidente reforça a necessidade de informar a posição do observador."},
    {
        "slug": "coordenadas-eclipticas",
        "title": "Coordenadas Eclípticas",
        "category": "Transformação de Coordenadas",
        "positive": "Nas aulas de astrofísica, a turma compara posições equatoriais e eclípticas do Sol e de planetas. Alternando o sistema de entrada, os alunos percebem como o formulário reutiliza os mesmos dados para produzir ângulos distintos e registram as diferenças em gráficos.",
        "negative": "Ao tentar extrapolar datas muito além dos limites do modelo, alguns valores retornam inconsistentes. O professor registra a observação e explica que a ferramenta foi calibrada para intervalos específicos, incentivando documentar novas necessidades."},
    {
        "slug": "coordenadas-galacticas",
        "title": "Coordenadas Galácticas",
        "category": "Transformação de Coordenadas",
        "positive": "Pesquisadores de rádio-astronomia convertem posições equatoriais de nebulosas para coordenadas galácticas. O formulário entrega longitude e latitude galáctica com rapidez, permitindo correlacionar os dados com mapas de emissões de hidrogênio.",
        "negative": "Durante uma manutenção, as políticas de segurança do laboratório bloqueiam execução de scripts. Sem JavaScript, o botão “Visualizar” não responde e os cientistas recorrem a cálculos off-line até ajustar as permissões."},
    {
        "slug": "coordenadas-supergalacticas",
        "title": "Coordenadas Supergalácticas",
        "category": "Transformação de Coordenadas",
        "positive": "Em um seminário de cosmologia, estudantes exploram posições supergalácticas de aglomerados catalogados. Eles inserem valores equatoriais e analisam as setas coloridas que representam os novos planos de referência, destacando estruturas em grande escala.",
        "negative": "Quando o módulo é aberto em um dispositivo sem aceleração gráfica, as setas que destacam o plano supergaláctico não aparecem. O grupo registra a limitação e prefere executar o simulador em máquinas com suporte WebGL completo."},
    {
        "slug": "data-juliana",
        "title": "Data Juliana",
        "category": "Transformação de Datas",
        "positive": "Historiadores analisam correspondência de observatórios antigos. Ao digitar datas gregorianas registradas nas cartas, o módulo retorna os valores julianos, simplificando o cálculo de intervalos entre observações.",
        "negative": "Quando um pesquisador tenta converter uma data inexistente, como 31 de fevereiro, o sistema recusa a entrada e destaca o campo, pois exige datas válidas para efetuar a conversão."},
    {
        "slug": "calendario-gregoriano",
        "title": "Calendário Gregoriano",
        "category": "Transformação de Datas",
        "positive": "Uma equipe de arqueologia lida com registros em datas julianas. Ao inserir os valores no módulo, obtém rapidamente a equivalência gregoriana e consegue sincronizar eventos com fontes modernas.",
        "negative": "Ao solicitar conversão para valores muito distantes do escopo da ferramenta, o sistema indica que não há correspondência e sugere revisar os limites do calendário, preservando a consistência histórica."}
]

heading_map = {"h1": "##", "h2": "###", "h3": "####", "h4": "#####"}

copied_assets = {}
current_base_path = ""

def append_line(lines, text=""):
    if text is None:
        return
    stripped = text.rstrip()
    lines.append(stripped)

def escape_attr(value: str) -> str:
    return value.replace('"', "&quot;")

def process(node, lines, asset_key, indent=""):
    if isinstance(node, NavigableString):
        text = str(node).strip()
        if text:
            append_line(lines, indent + text)
        return
    if not hasattr(node, "name"):
        return
    if node.name in heading_map:
        append_line(lines, f"{heading_map[node.name]} {node.get_text(strip=True)}\n")
    elif node.name == "img":
        src = node.get("src")
        alt = node.get("alt") or "Imagem"
        if src:
            if src.startswith("http://") or src.startswith("https://"):
                append_line(lines)
                append_line(lines, f'<p align="center"><img src="{escape_attr(src)}" alt="{escape_attr(alt)}" /></p>')
                append_line(lines)
            else:
                candidates = []
                candidates.append(os.path.normpath(os.path.join(current_base_path, src)))
                normalized_src = src.lstrip("./")
                candidates.append(os.path.normpath(os.path.join(STATIC_ROOT, normalized_src)))
                if "static/" in src:
                    static_suffix = src.split("static/", 1)[1]
                    candidates.append(os.path.normpath(os.path.join(STATIC_ROOT, static_suffix)))
                # Remove duplicates preserving order
                seen = set()
                unique_candidates = []
                for candidate in candidates:
                    if candidate not in seen:
                        unique_candidates.append(candidate)
                        seen.add(candidate)
                source_path = next((c for c in unique_candidates if os.path.exists(c)), None)
                if source_path:
                    dest_dir = os.path.join(ASSETS_ROOT, asset_key)
                    os.makedirs(dest_dir, exist_ok=True)
                    filename = os.path.basename(source_path)
                    key = (asset_key, filename)
                    if key not in copied_assets:
                        shutil.copyfile(source_path, os.path.join(dest_dir, filename))
                        copied_assets[key] = True
                    append_line(lines)
                    append_line(lines, f'<p align="center"><img src="assets/{asset_key}/{escape_attr(filename)}" alt="{escape_attr(alt)}" /></p>')
                    append_line(lines)
                else:
                    append_line(lines)
                    append_line(lines, f'<p align="center"><img src="{escape_attr(src)}" alt="{escape_attr(alt)}" /></p>')
                    append_line(lines)
    elif node.name == "iframe":
        src = node.get("src")
        if src and "youtube.com/embed/" in src:
            video_id = src.split("youtube.com/embed/", 1)[1].split("?", 1)[0]
            link = f"https://www.youtube.com/watch?v={video_id}"
        else:
            link = src or ""
        append_line(lines)
        if link:
            append_line(lines, f"Link de vídeo de explicação no YouTube: {link}")
        else:
            append_line(lines, "Conteúdo em iframe disponível apenas na versão original do site.")
        append_line(lines)
    elif node.name == "p":
        text = node.get_text(" ", strip=True)
        if text:
            append_line(lines, indent + text + "\n")
    elif node.name == "ul":
        for li in node.find_all("li", recursive=False):
            text = li.get_text(" ", strip=True)
            append_line(lines, f"- {text}")
        append_line(lines)
    elif node.name == "ol":
        for idx, li in enumerate(node.find_all("li", recursive=False), start=1):
            text = li.get_text(" ", strip=True)
            append_line(lines, f"{idx}. {text}")
        append_line(lines)
    else:
        for child in node.children:
            process(child, lines, asset_key, indent)


def html_to_markdown(path, asset_key):
    if not os.path.exists(path):
        return "*Conteúdo não disponível no momento.*"
    with open(path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    container = soup.body or soup
    lines = []
    global current_base_path
    current_base_path = os.path.dirname(path)
    for child in container.children:
        process(child, lines, asset_key)
    # Clean empty lines duplicates
    cleaned = []
    previous_blank = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not previous_blank:
                cleaned.append("")
            previous_blank = True
        else:
            cleaned.append(stripped)
            previous_blank = False
    return "\n".join(cleaned).strip() + "\n"

manual_index = {cat: [] for cat in {m["category"] for m in modules}}
scenario_links = {cat: [] for cat in manual_index}

for module in modules:
    slug = module["slug"]
    title = module["title"]
    sobre_path = os.path.join(TEMPLATES, "webgl", slug, "sobre.html")
    ajuda_path = os.path.join(TEMPLATES, "webgl", slug, "ajuda.html")
    sobre_md = html_to_markdown(sobre_path, slug)
    ajuda_md = html_to_markdown(ajuda_path, slug)
    manual_md = f"# Manual – {title}\n\n## Sobre\n\n{sobre_md}\n## Dicas de uso\n\n{ajuda_md}"
    manual_filename = f"{MANUAL_PREFIX}{slug}.md"
    manual_file = os.path.join(WIKI_ROOT, manual_filename)
    with open(manual_file, "w", encoding="utf-8") as f:
        f.write(manual_md)
    manual_index[module["category"]].append((title, manual_filename[:-3]))

    scenario_md = textwrap.dedent(f"""
    # Cenários – {title}

    ## Cenário Positivo
    {module['positive']}

    ## Cenário Negativo
    {module['negative']}
    """).strip() + "\n"
    scenario_filename = f"{CENARIO_PREFIX}{slug}.md"
    scenario_file = os.path.join(WIKI_ROOT, scenario_filename)
    with open(scenario_file, "w", encoding="utf-8") as f:
        f.write(scenario_md)
    scenario_links[module["category"]].append((title, scenario_filename[:-3]))

# Update manual index page
manual_lines = ["# 4. Manual de Utilização para Usuários Contemplados", ""]
manual_lines.append("Este manual reúne instruções detalhadas para cada módulo do ASTRO. Clique em um dos itens abaixo para acessar o guia completo.")
manual_lines.append("")
for category in sorted(manual_index.keys()):
    manual_lines.append(f"## {category}")
    manual_lines.append("")
    for title, link in sorted(manual_index[category]):
        manual_lines.append(f"- [[Manual – {title}|{link}]]")
    manual_lines.append("")
manual_page = "\n".join(manual_lines).strip() + "\n"
with open(os.path.join(WIKI_ROOT, "04-Manual-de-Utilizacao.md"), "w", encoding="utf-8") as f:
    f.write(manual_page)

# Update scenarios index
scenario_lines = ["# 2. Visão de Projeto e Cenários de Utilização", ""]
scenario_lines.append("Esta seção reúne cenários que orientam tanto o design quanto o uso e a evolução do ASTRO.")
scenario_lines.append("Os relatos destacam expectativas dos criadores, ajudam usuários a interpretar a experiência e sinalizam limites conhecidos.")
scenario_lines.append("A abordagem segue a proposta de John Carroll para cenários de interação." )
scenario_lines.append("<https://www.sciencedirect.com/science/article/pii/S0953543800000230#FIG2>")
scenario_lines.append("")
scenario_lines.append("Cada módulo possui um cenário positivo (uso esperado) e um cenário negativo (limitação observada), incentivando melhorias futuras.")
scenario_lines.append("")
for category in sorted(scenario_links.keys()):
    scenario_lines.append(f"## {category}")
    scenario_lines.append("")
    for title, link in sorted(scenario_links[category]):
        scenario_lines.append(f"- [[Cenários – {title}|{link}]]")
    scenario_lines.append("")
scenario_page = "\n".join(scenario_lines).strip() + "\n"
with open(os.path.join(WIKI_ROOT, "02-Cenarios-de-Utilizacao.md"), "w", encoding="utf-8") as f:
    f.write(scenario_page)
