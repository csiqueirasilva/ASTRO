package br.on.daed.services.html.orbitas;

import com.google.gson.Gson;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 *
 * @author csiqueira
 */
public class Orbitas {

    private static final HashMap<String, String> arquivoNomeReferencia = new HashMap<>();

    public static void saveReferenceFile() {
        Gson gson = new Gson();

        try {

            String str = gson.toJson(arquivoNomeReferencia);

            FileOutputStream outputStream = new FileOutputStream("referencia.json", false);

            outputStream.write(str.getBytes());
            outputStream.close();

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public static void saveToFile(Object[] data) {
        Gson gson = new Gson();

        try {
            String str = gson.toJson(data);

            String filename = data[0].toString().replaceAll(" ", "-").replaceAll("[^a-zA-Z0-9-]+", "").toLowerCase() + ".json";

            FileOutputStream outputStream = new FileOutputStream(filename, false);

            outputStream.write(str.getBytes());
            outputStream.close();

            arquivoNomeReferencia.put((String) data[0], filename);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public static void main(String arguments[]) throws IOException {

//        double a = 0.1;
//
//        int raioGalaxiaBase = 20;
//        
//        Object[] test = new Object[48002];
//
//        test[0] = "Involuta da Circunferência";
//        test[1] = "https://pt.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=Evolvente&callback=?";
//        
//        for (int i = 2; i < test.length; i = i + 4) {
//            double t = ((i - 2) / 4) * 0.0025;
//            double x = a * (Math.cos(t) + t * Math.sin(t));
//            double y = a * (Math.sin(t) - t * Math.cos(t));
//            double z = 0;
//            test[i] = t;
//            test[i + 1] = x;
//            test[i + 2] = y;
//            test[i + 3] = z;
//        }
//        
//        saveToFile(test);
//        
//        a = 4;
//        double b = 8;
//        double c = 6;
//        
//        test = new Object[48002];
//
//        test[0] = "Epitrocoide";
//        test[1] = "https://pt.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=Epitrocoide&callback=?";
//
//        for (int i = 2; i < test.length; i = i + 4) {
//            double t = ((i - 2) / 4) * 0.0025;
//            double x = (a + b) * Math.cos(t) - c * Math.cos((a/b + t) * t);
//            double y = (a + b) * Math.sin(t) - c * Math.sin((a/b + 1) * t);
//            double z = 0;
//            test[i] = t;
//            
//            test[i + 1] = x;
//            test[i + 2] = y;
//            test[i + 3] = z;
//        }
//        
//        saveToFile(test);
//
//        a = 3;
//        b = 2;
//        c = 1;
//        
//        test = new Object[48002];
//
//        test[0] = "Curvas de Lissajous";
//        test[1] = "https://pt.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=Curvas%20de%20Lissajous&callback=?";
//
//        for (int i = 2; i < test.length; i = i + 4) {
//            double t = ((i - 2) / 4) * 0.0025;
//            double x = a * Math.sin(t + c);
//            double y = b * Math.sin(t);
//            double z = 0;
//            test[i] = t;
//            
//            test[i + 1] = x;
//            test[i + 2] = y;
//            test[i + 3] = z;
//        }
//        
//        saveToFile(test);
//        
//        saveReferenceFile();
//        Path p = Paths.get();
        File file = new File("orbitas");

        if (file.isDirectory()) {

            Pattern regex = Pattern.compile("(-?\\d+.?\\d*)[ ]+(-?\\d+.?\\d*)[ ]+(-?\\d+.?\\d*)[ ]+(-?\\d+.?\\d*)");
            
            File[] listFiles = file.listFiles();

            for (File f : listFiles) {

                ArrayList<Object> list = new ArrayList<>();
                String name = f.getName();
                
                list.add(name.toUpperCase());
                list.add("https://pt.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=" + name + "&callback=?");
                
                Path path = Paths.get(f.getAbsolutePath());
                List<String> readAllLines = Files.readAllLines(path);
                for (String line : readAllLines) {
                    
                    line = line.trim();
                    Matcher matcher = regex.matcher(line);
                    
                    if (matcher.matches()) {
                        double t = Double.parseDouble(matcher.group(1));
                        double x = Double.parseDouble(matcher.group(2));
                        double y = Double.parseDouble(matcher.group(3));
                        double z = Double.parseDouble(matcher.group(4));
                        
                        list.add(t);
                        list.add(x);
                        list.add(y);
                        list.add(z);
                    }
                }
                
                Object[] saida = list.toArray();
                System.out.println("ADICIONANDO " + saida.length);
                saveToFile(saida);
                
            }
            
            saveReferenceFile();
        }

    }

}
