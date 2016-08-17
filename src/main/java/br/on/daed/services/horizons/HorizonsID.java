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
	CERES(1),
	PALLAS(2),
	VESTA(4);
	
	private Integer value;
	
	HorizonsID(int val) {
		this.value = val;
	};
	
	@Override
	public String toString() {
		return value.toString();
	}
	
}
