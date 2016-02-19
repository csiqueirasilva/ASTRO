/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.html.portos;

/**
 *
 * @author csiqueira
 */
public class PortoData {

    private String codigo;
    private String nome;
    private Integer anoMinimo;
    private Integer anoMaximo;

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Integer getAnoMaximo() {
        return anoMaximo;
    }

    public void setAnoMaximo(Integer anoMaximo) {
        this.anoMaximo = anoMaximo;
    }

    public Integer getAnoMinimo() {
        return anoMinimo;
    }

    public void setAnoMinimo(Integer anoMinimo) {
        this.anoMinimo = anoMinimo;
    }
}
