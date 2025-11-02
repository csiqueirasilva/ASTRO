/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.filters;

import javax.servlet.*;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Date;
import javax.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// src: http://stackoverflow.com/questions/2876250/tomcat-cache-control
@Component
public class CacheControlFilter extends OncePerRequestFilter {

    @Override
    public void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletResponse resp = (HttpServletResponse) response;
        resp.setHeader("Expires", "Tue, 03 Jul 2001 06:00:00 GMT");
        resp.setDateHeader("Last-Modified", new Date().getTime());
        resp.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0");
        resp.setHeader("Pragma", "no-cache");

        chain.doFilter(request, response);
    }

}
