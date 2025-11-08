/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons.objects;

import java.util.List;

/**
 *
 * @author csiqueira
 */
public class CartesianCoordinates extends HorizonsResult {

	private final String X;
	private final String Y;
	private final String Z;
	private final String VX;
	private final String VY;
	private final String VZ;

	public CartesianCoordinates(List<String> list) {
		if (list != null && list.size() == 6) {
			X = list.get(0);
			Y = list.get(1);
			Z = list.get(2);
			VX = list.get(3);
			VY = list.get(4);
			VZ = list.get(5);
		} else {
			throw new UnsupportedOperationException("Not enough args to create cartesian coordinates (vector) horizons' result");
		}
	}

	public String getX() {
		return X;
	}

	public String getY() {
		return Y;
	}

	public String getZ() {
		return Z;
	}

	public String getVX() {
		return VX;
	}

	public String getVY() {
		return VY;
	}

	public String getVZ() {
		return VZ;
	}

}
