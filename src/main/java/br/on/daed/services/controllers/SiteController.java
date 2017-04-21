package br.on.daed.services.controllers;

import br.on.daed.services.html.HTMLHandling;
import br.on.daed.services.html.portos.TabuaMare;
import br.on.daed.services.pdf.DadosMagneticos;
import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/")
public class SiteController {

    private String setWebGLTemplate(ModelMap map, String path) {
        map.addAttribute("conteudo", path);
        return "templatewebgl";
    }

    @RequestMapping("/angulo-horario")
    public String coordenadasHorarias(ModelMap map) {
        return setWebGLTemplate(map, "angulo-horario");
    }

    @RequestMapping("/")
    public String index(ModelMap map) {
        return "mainpage";
    }

    @RequestMapping("/obliquidade-da-ecliptica")
    public String ecliptica(ModelMap map) {
        return setWebGLTemplate(map, "obliquidade-da-ecliptica");
    }

    @RequestMapping("/coordenadas-supergalacticas")
    public String coordenadasSupergalacticas(ModelMap map) {
        return setWebGLTemplate(map, "coordenadas-supergalacticas");
    }

    @RequestMapping("/coordenadas-galacticas")
    public String coordenadasGalacticas(ModelMap map) {
        return setWebGLTemplate(map, "coordenadas-galacticas");
    }

    @RequestMapping("/coordenadas-eclipticas")
    public String coordenadasEclipticas(ModelMap map) {
        return setWebGLTemplate(map, "coordenadas-eclipticas");
    }

    @RequestMapping("/coordenadas-horizontais")
    public String coordenadasHorizontais(ModelMap map) {
        return setWebGLTemplate(map, "coordenadas-horizontais");
    }

    @RequestMapping("/coordenadas-equatoriais")
    public String coordenadasEquatoriais(ModelMap map) {
        return setWebGLTemplate(map, "coordenadas-equatoriais");
    }

    @RequestMapping("/movimentos-da-terra")
    public String movimentosTerra(ModelMap map) {
        return setWebGLTemplate(map, "movimentos-da-terra");
    }

    @RequestMapping("/calendario-gregoriano")
    public String dataGregoriana(ModelMap map) {
        return setWebGLTemplate(map, "calendario-gregoriano");
    }

    @RequestMapping("/data-juliana")
    public String dataJuliana(ModelMap map) {
        return setWebGLTemplate(map, "data-juliana");
    }

    @RequestMapping("/posicao-sol")
    public String posicaoSol(ModelMap map) {
        return setWebGLTemplate(map, "posicao-sol");
    }

    @RequestMapping("/posicao-lua")
    public String posicaoLua(ModelMap map) {
        return setWebGLTemplate(map, "posicao-lua");
    }

    @RequestMapping("/eclipses")
    public String eclipseSolar(ModelMap map) {
        return setWebGLTemplate(map, "eclipses");
    }

    @RequestMapping("/equacao-de-kepler")
    public String equacaoKepler(ModelMap map) {
        return setWebGLTemplate(map, "equacao-de-kepler");
    }

	@RequestMapping("/satelites-jupiter")
    public String satelitesJupiter(ModelMap map) {
        return setWebGLTemplate(map, "satelites-jupiter");
    }
	
    @RequestMapping("/linhas-de-forca")
    public String linhasDeForca(ModelMap map) {
        return setWebGLTemplate(map, "linhas-de-forca");
    }

    @RequestMapping("/magnetismo-terrestre")
    public String magnetismoTerrestre(ModelMap map) {
        return setWebGLTemplate(map, "magnetismo-terrestre");
    }
    
    private final String GRAFICO_DEFAULT = "ead2015";

    @RequestMapping("/grafico-globo")
    public String graficoGlobo(ModelMap map, @RequestParam(value = "data", required = false) String conteudo) {
        map.addAttribute("conteudo", conteudo == null ? GRAFICO_DEFAULT : conteudo);
        return "webgl/grafico-globo/grafico-globo";
    }

    @RequestMapping("/holo-grafico-globo")
    public String holoPiramide(ModelMap map, @RequestParam(value = "data", required = false) String conteudo) {
        map.addAttribute("conteudo", conteudo == null ? GRAFICO_DEFAULT : conteudo);
        return "webgl/holo-piramide/grafico-globo";
    }

    @RequestMapping("/holo-grafico-globo-2")
    public String holoPiramide2(ModelMap map, @RequestParam(value = "data", required = false) String conteudo) {
        map.addAttribute("conteudo", conteudo == null ? GRAFICO_DEFAULT : conteudo);
        return "webgl/holo-piramide/grafico-globo-2";
    }

    @RequestMapping("/tabua-mares")
    public @ResponseBody
    Object tabuaMares(ModelMap map) {
        return HTMLHandling.getMareOptions();
    }

    @RequestMapping("/mares")
    public String mares(ModelMap map) {
		map.addAttribute("maxAnoTabuas", HTMLHandling.getMareYear());
        return setWebGLTemplate(map, "mares");
    }

    @RequestMapping("/tabua-mares/{tabuaMares}")
    public @ResponseBody
    TabuaMare tabuaMares(@PathVariable String tabuaMares) {
        return HTMLHandling.getTabuaMare(tabuaMares);
    }

    private File[] getArquivosOrbitas(HttpServletRequest request) {
        String path = request.getServletContext().getRealPath("/WEB-INF/classes/static/lib/on-daed-js/orbitas");

        File folder = new File(path);

        File[] files = folder.listFiles(new FilenameFilter() {

            @Override
            public boolean accept(File dir, String name) {
                return name.endsWith(".json") && !name.equals("referencia.json");
            }

        });

        return files;
    }

    @RequestMapping("/orbitas")
    public void orbitas(HttpServletRequest request, HttpServletResponse response) throws IOException {
        File[] arquivosOrbitas = getArquivosOrbitas(request);

        if (arquivosOrbitas.length > 0) {
            response.sendRedirect("orbitas-" + arquivosOrbitas[0].getName().replace(".json", ""));
        }
    }

    @RequestMapping("/orbitas-{orbita}")
    public String orbitas(HttpServletRequest request, ModelMap map, @PathVariable String orbita) {
        String filename = orbita + ".json";

        File[] arquivosOrbitas = getArquivosOrbitas(request);

        String arquivoEscolhido = null;

        for (int i = 0; i < arquivosOrbitas.length; i++) {
            if (arquivosOrbitas[i].getName().equals(filename)) {
                arquivoEscolhido = filename;
            }
        }

        if (arquivoEscolhido == null) {
            arquivoEscolhido = arquivosOrbitas[0].getName();
        }

        map.addAttribute("arquivoDados", arquivoEscolhido);

        return setWebGLTemplate(map, "orbitas");
    }

    @RequestMapping(value = "/pdf/dados-magneticos.pdf")
    @ResponseBody
    public byte[] dadosMagneticos(HttpServletResponse response, @RequestParam(value = "ano") String ano, @RequestParam(value = "tipo") String tipo) throws UnsupportedOperationException, IOException, InterruptedException {
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=dados-magneticos.pdf");
        return DadosMagneticos.gerarPDF(ano, tipo);
    }

}
