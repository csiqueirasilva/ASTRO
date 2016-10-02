/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons;

/**
 *
 * @author csiqueira
 */
public enum HorizonsCenter {
	SSB("500@0"),
	JUPITER("500@599");
	
	private final String value;
	
	HorizonsCenter(String v) {
		this.value = v;
	}
	
	@Override
	public String toString() {
		return this.value;
	}
}