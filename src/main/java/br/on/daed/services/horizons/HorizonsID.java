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
public enum HorizonsID {
	EARTH_MOON_BARY(3),
	MERCURY(199),
	VENUS(299),
	EARTH(399),
	MARS(499),
	JUPITER(599),
	SATURN(699),
	URANUS(799),
	NEPTUNE(899),
	CERES("Ceres"),
	PALLAS("Pallas"),
	VESTA("Vesta"),
	APOPHIS(99942);
	
	private final Integer value;
	private final String stringValue;

	HorizonsID(String val) {
		this.value = null;
		this.stringValue = val;
	};
	
	HorizonsID(int val) {
		this.stringValue = null;
		this.value = val;
	};
	
	@Override
	public String toString() {
		return value == null ? stringValue : value.toString();
	}

	Object getValue() {
		return this.value != null ? this.value : this.stringValue;
	}
	
}
