/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.initializers;

import br.on.daed.services.configurations.WebMvcConfig;
import br.on.daed.services.gfx.TelaPrincipal;
import java.awt.Desktop;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.Filter;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRegistration;
import javax.swing.JFrame;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.embedded.AnnotationConfigEmbeddedWebApplicationContext;
import org.springframework.boot.context.embedded.tomcat.TomcatEmbeddedServletContainer;
import org.springframework.boot.context.web.SpringBootServletInitializer;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.WebApplicationInitializer;
import org.springframework.web.context.ContextLoaderListener;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.support.AbstractAnnotationConfigDispatcherServletInitializer;

/**
 *
 * @author notebook
 */
@SpringBootApplication
@Configuration
@ComponentScan("br.on.daed")
public class SpringBootApplicationInitializer extends SpringBootServletInitializer {

    private static String url = null;
    
    public static void main(String[] args) {
        java.awt.EventQueue.invokeLater(new Runnable() {
            public void run() {
                TelaPrincipal telaPrincipal = new TelaPrincipal();
                telaPrincipal.setVisible(true);

                new Thread(new Runnable() {
                    public void run() {
                        ConfigurableApplicationContext context = SpringApplication.run(SpringBootApplicationInitializer.class, args);
                        int port = ((TomcatEmbeddedServletContainer) ((AnnotationConfigEmbeddedWebApplicationContext) context).getEmbeddedServletContainer()).getPort();
                        url = "http://localhost:" + port;
                        telaPrincipal.readyState(url);
                    }
                }).start();
            }
        });
    }

    public static String getUrl() {
        return url;
    }
    
    @Override
    protected SpringApplicationBuilder
            configure(SpringApplicationBuilder application) {
        return application.sources(SpringBootApplicationInitializer.class
        );
    }
}
