/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons.objects;

/**
 *
 * @author csiqueira
 */
public abstract class HorizonsResult {

	protected Object id;
	protected String name;
	protected Double mass;
	protected Double gm;
	protected Double radius;
	
	public Object getId() {
		return id;
	}

	public void setId(Object id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public Double getMass() {
		return mass;
	}

	public void setMass(Double mass) {
		this.mass = mass;
	}

	public Double getGm() {
		return gm;
	}

	public void setGm(Double gm) {
		this.gm = gm;
	}

	public Double getRadius() {
		return radius;
	}

	public void setRadius(Double radius) {
		this.radius = radius;
	}
	
}
