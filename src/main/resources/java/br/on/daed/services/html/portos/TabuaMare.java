/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.html.portos;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author csiqueira
 */
public class TabuaMare {

    private final List<EntradaTabua> entradas = new ArrayList<>();
    private String nome;
    private String fuso;
    private String latitude;
    private String longitude;
    private String instituicao;
    private String componentes;
    private String nivelMedio;
    private String ano;
    private String carta;
    
    @JsonProperty("totalPrevisoes")
    public int getTotalPrevisoes() {
        int acc = 0;

        for (EntradaTabua et : entradas) {
            acc += et.getHoraAltura().size();
        }

        return acc;
    }

    public List<EntradaTabua> getEntradas() {
        return entradas;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getFuso() {
        return fuso;
    }

    public void setFuso(String fuso) {
        this.fuso = fuso;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
    }

    public String getInstituicao() {
        return instituicao;
    }

    public void setInstituicao(String instituicao) {
        this.instituicao = instituicao;
    }

    public String getComponentes() {
        return componentes;
    }

    public void setComponentes(String componentes) {
        this.componentes = componentes;
    }

    public String getNivelMedio() {
        return nivelMedio;
    }

    public void setNivelMedio(String nivelMedio) {
        this.nivelMedio = nivelMedio;
    }

    public String getAno() {
        return ano;
    }

    public void setAno(String ano) {
        this.ano = ano;
    }

    public String getCarta() {
        return carta;
    }

    public void setCarta(String carta) {
        this.carta = carta;
    }

}
