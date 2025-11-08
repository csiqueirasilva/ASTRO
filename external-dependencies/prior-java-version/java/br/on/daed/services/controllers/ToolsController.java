package br.on.daed.services.controllers;

import java.io.IOException;
 
import javax.servlet.http.HttpServletResponse;
 
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
 
/**
 * This Spring controller class implements a CSV file download functionality.
 * @author www.codejava.net
 *
 */
@Controller
public class ToolsController {
    @RequestMapping(value = "/csv", method = RequestMethod.POST)
    public void csv(@RequestParam("titulos") String headers, @RequestParam("corpo") String corpo, HttpServletResponse response) throws IOException {
        String csvFileName = "export.csv";
        response.setContentType("text/csv");

        String headerKey = "Content-Disposition";
        String headerValue = String.format("attachment; filename=\"%s\"",
                csvFileName);
        response.setHeader(headerKey, headerValue);
        
        response.getWriter().write(headers);
        response.getWriter().write("\n");
        response.getWriter().write(corpo);
    }
}