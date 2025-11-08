/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.html;

import br.on.daed.services.html.portos.EntradaTabua;
import br.on.daed.services.html.portos.PortoData;
import br.on.daed.services.html.portos.TabuaMare;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.Elements;

/**
 *
 * @author csiqueira
 */
public class HTMLHandling {

    public static String getURLContent(String url) {
        URL u;
        InputStream is = null;
        BufferedReader br;
        String total = null;
        try {
            u = new URL(url);
            is = u.openStream();  // throws an IOException
            br = new BufferedReader(new InputStreamReader(is));

            String line;
            total = "";
            while ((line = br.readLine()) != null) {
                total += line;
            }
        } catch (IOException e) {
            total = null;
        } finally {
            try {
                if (is != null) {
                    is.close();
                }
            } catch (IOException ioe) {
                // nothing to see here
            }
        }
        return total;
    }

    private static final String MARES_REF_URL = "http://www.mar.mil.br/dhn/chm/box-previsao-mare/tabuas/index.htm";

	public static Integer getMareYear() {
		Integer ret = null;
		
		try {
			Document d = Jsoup.parse(new URL(MARES_REF_URL), 1000);
			Elements yearOption = d.getElementsByAttributeValue("name", "cboAno");
			Element selectYear = yearOption.first().child(0);
			ret = Integer.parseInt(selectYear.text());
		} catch (Exception e) {
			ret = 2016; // defaults to 2016 if cant find the year
		}
		
		return ret;
	}
	
    public static TreeSet<PortoData> getMareOptions() {
        TreeSet<PortoData> ret = null;

        try {
            Document d = Jsoup.parse(new URL(MARES_REF_URL), 1000);
            Elements selectMaresSrc = d.getElementsByAttributeValue("name", "cboNomePorto");

            if (!selectMaresSrc.isEmpty()) {
                ret = new TreeSet(new Comparator<PortoData>() {

                    @Override
                    public int compare(PortoData o1, PortoData o2) {
                        return o1.getNome().compareToIgnoreCase(o2.getNome());
                    }

                });

                Element portosSelect = selectMaresSrc.first();
                Elements codigoPortos = portosSelect.children();

                for (Element opPorto : codigoPortos) {
                    String nome = opPorto.text().trim();

                    Pattern estado = Pattern.compile("(?:[(])?ESTADO D(?:O|E|A) (.*)[)]");
                    Matcher m = estado.matcher(nome);

                    if (m.find()) {
                        String stringEstado = m.group(1);
                        nome = stringEstado + " - " + nome.replace(m.group(0), "");
                    }

                    String codigo = opPorto.attr("value");

                    PortoData pd = new PortoData();

                    pd.setCodigo(codigo);
                    pd.setNome(nome);

                    if (nome.contains("Previsões até")) {
                        Pattern anoAte = Pattern.compile("\\d+");
                        Matcher matcherAnoAte = anoAte.matcher(nome);

                        matcherAnoAte.find();
                        String anoAteString = matcherAnoAte.group(0);

                        int anoMax = Integer.parseInt(anoAteString);

                        pd.setAnoMaximo(anoMax);
                    }

                    boolean achou = false;

                    for (Iterator<PortoData> it = ret.iterator(); !achou && it.hasNext();) {
                        PortoData pdAntigo = it.next();
                        String nomeAntigo = pdAntigo.getNome();
                        String nomeAntigoCheck = nomeAntigo.replace(")", "").replace("(", "");
                        String nomeCheck = nome.replace(")", "").replace("(", "");

                        if (nomeAntigoCheck.contains(nomeCheck) || nomeCheck.contains(nomeAntigoCheck)) {
                            int anoMax = 2011;

                            if (pdAntigo.getAnoMaximo() != null) {
                                anoMax = pdAntigo.getAnoMaximo();
                            }

                            pdAntigo.setAnoMaximo(anoMax);
                            pd.setAnoMinimo(anoMax + 1);
                            pd.setNome(nome);

                            achou = true;
                        } else if (nome.equals("ESTAÇÃO ANTÁRTICA COMANDANTE FERRAZ")) {
                            pd.setAnoMinimo(2009);
                            achou = true;
                        } else if (nome.equals("CAPITANIA DOS PORTOS DE SERGIPE")) {
                            pd.setAnoMinimo(2006);
                            achou = true;
                        } else if (nome.equals("PORTO DE MACAU")) {
                            pd.setAnoMinimo(2007);
                            achou = true;
                        }
                    }

                    ret.add(pd);
                }
            }

        } catch (IOException e) {
            ret = null;
        }

        return ret;
    }

    public static TabuaMare getTabuaMare(String pagina) {
        TabuaMare ret = null;

        String url = MARES_REF_URL.replace("index.htm", pagina + ".htm");

        try {
            ret = new TabuaMare();
            Document d = Jsoup.parse(new URL(url).openStream(), "ISO-8859-1", url);

            Elements tables = d.getElementsByTag("table");

            if (tables.size() == 1) {
                
                Element table = tables.first();
                
                if (pagina.matches("40252[a-zA-Z]{3}2011")) {
                    ret.setLatitude("20º19,1'S");
                    ret.setLongitude("040º17,8'W");
                    ret.setFuso("+03.0");
                    ret.setAno("2011");
                    ret.setNivelMedio("0.81");
                    ret.setCarta("01401");
                    ret.setComponentes("51");
                    ret.setNome("PORTO DE VITÓRIA - CAPITANIA DOS PORTOS DO ES (ESTADO DO ESPÍRITO SANTO)");
                } else {

                    Elements attrs = table.parent().parent().siblingElements().not("div").select("strong");
                    String attrNome = table.parent().parent().parent().parent().siblingElements().text();

                    String output = "";

                    for (Element e : attrs) {
                        String text = ((TextNode) e.nextSibling()).getWholeText() + " ";
                        text = text.replaceAll("\\s", "");
                        output += e.text() + text + " ";
                    }

                    output = output.replace(Character.toString((char) 160), "");

                    Pattern capturePattern = Pattern.compile("(?<=:)[^ ]+");
                    Matcher m = capturePattern.matcher(output);

                    m.find();
                    ret.setLatitude(m.group().trim());
                    m.find();
                    ret.setLongitude(m.group().trim());
                    m.find();
                    ret.setFuso(m.group().trim());
                    m.find();
                    ret.setAno(m.group().trim());
                    m.find();
                    ret.setInstituicao(m.group().trim());
                    m.find();
                    ret.setNivelMedio(m.group().trim());
                    m.find();
                    ret.setCarta(m.group().trim());

                    capturePattern = Pattern.compile("(\\d+) (?:Componentes)");
                    m = capturePattern.matcher(output);

                    m.find();
                    ret.setComponentes(m.group(1).trim());

                    ret.setNome(attrNome);
                }

                Elements lines = table.select("tr");

                for (int i = 1; i < lines.size(); i++) {
                    Element line = lines.get(i);
                    if (line.children().size() == 4) {
                        EntradaTabua et;

                        String diaLinha = line.child(1).text();

                        if (!diaLinha.isEmpty()) {
                            et = new EntradaTabua();
                            et.setDia(diaLinha);
                            ret.getEntradas().add(et);
                        } else {
                            et = ret.getEntradas().get(ret.getEntradas().size() - 1);
                        }

                        Elements imgs = line.select("img");

                        if (imgs.size() == 1) {
                            Element img = imgs.first();
                            et.setLua(img.attr("src").toUpperCase().replaceAll("\\.GIF", ""));
                        }

                        String horaLinha = line.child(2).text();
                        String alturaLinha = line.child(3).text();

                        et.getHoraAltura().put(horaLinha, alturaLinha);
                    }
                }

            }

        } catch (IOException e) {
            ret = null;
        }

        return ret;
    }

}
