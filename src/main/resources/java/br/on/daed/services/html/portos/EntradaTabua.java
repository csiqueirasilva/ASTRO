/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.html.portos;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 *
 * @author csiqueira
 */
public class EntradaTabua {

    private final Map<String, String> horaAltura = new LinkedHashMap<>();
    private String lua;
    private String dia;

    public String getDia() {
        return dia;
    }

    public void setDia(String dia) {
        this.dia = dia;
    }

    public Map<String, String> getHoraAltura() {
        return horaAltura;
    }

    public String getLua() {
        return lua;
    }

    public void setLua(String lua) {
        this.lua = lua;
    }
}
