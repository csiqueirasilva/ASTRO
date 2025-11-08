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
public enum HorizonsOptions {
	ORBITAL_ELEMENTS("ELEM"),
	CARTESIAN("VECTOR");
	
	private final String value;
	
	HorizonsOptions(String v) {
		this.value = v;
	}
	
	@Override
	public String toString() {
		return this.value;
	}
}
