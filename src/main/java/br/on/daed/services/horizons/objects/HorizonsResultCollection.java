/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons.objects;

import br.on.daed.services.horizons.HorizonsOptions;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author csiqueira
 * @param <T>
 */
public class HorizonsResultCollection<T extends HorizonsResult> {
	
	private Double jd;
	private final List<T> results;
	private HorizonsOptions op;
	
	public HorizonsResultCollection() {
		this.results = new ArrayList<>();
	}
	
	public void add(T obj) {
		this.results.add(obj);
	}

	public Double getJd() {
		return jd;
	}

	public void setJd(Double jd) {
		this.jd = jd;
	}

	public HorizonsOptions getOp() {
		return op;
	}

	public void setOp(HorizonsOptions op) {
		this.op = op;
	}
	
}