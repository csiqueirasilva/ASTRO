/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.pdf;

import br.on.daed.services.process.ProcessHelper;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.List;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;

/**
 *
 * @author csiqueira
 */
public class DadosMagneticos {

    private final static String[] TIPO_DADOS_MAGNETICOS = {"1", "2", "3"};
    private final static Double[] ANO_MAGNETICO = {1900.00, 2030.0};

    public static byte[] gerarPDF(String ano, String tipo) throws IOException, InterruptedException, UnsupportedOperationException {

        File tmpFolder;
        String folderName;

        Double anoDouble = Double.parseDouble(ano);
        List<String> dados = Arrays.asList(TIPO_DADOS_MAGNETICOS);

        byte[] ret = null;

        if (anoDouble >= ANO_MAGNETICO[0] && anoDouble <= ANO_MAGNETICO[1] && dados.contains(tipo)) {

            do {

                folderName = "/tmp/dislin" + Double.toString(System.currentTimeMillis() * Math.random());
                tmpFolder = new File(folderName);

            } while (tmpFolder.exists());

            tmpFolder.mkdir();

            ProcessBuilder processBuilder = new ProcessBuilder(
                    "/opt/declinacao-magnetica/./gerar",
                    ano,
                    tipo);

            processBuilder.directory(tmpFolder);
            
            processBuilder.environment().put("LD_LIBRARY_PATH", "/usr/local/dislin");

            Process proc = processBuilder.start();

            proc.waitFor();

            ProcessHelper.outputProcess(proc);
            
            File arquivoServido = new File(folderName + "/dislin.pdf");

            FileInputStream fis = new FileInputStream(arquivoServido);

            ret = IOUtils.toByteArray(fis);

            processBuilder = new ProcessBuilder(
                    "rm",
                    "-r",
                    folderName);

            tmpFolder = new File("/");

            processBuilder.directory(tmpFolder);

            Process delete = processBuilder.start();

            delete.waitFor();

        } else {
            throw new UnsupportedOperationException("Entrada inválida");
        }
        return ret;
    }

}
