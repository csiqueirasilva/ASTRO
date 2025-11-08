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
public class OrbitalElements extends HorizonsResult {

	private final String EC;
	private final String QR;
	private final String IN;
	private final String OM;
	private final String W;
	private final String Tp;
	private final String N;
	private final String MA;
	private final String TA;
	private final String A;
	private final String AD;
	private final String PR;

	public OrbitalElements(List<String> list) {
		if (list != null && list.size() == 12) {
			EC = list.get(0);
			QR = list.get(1);
			IN = list.get(2);
			OM = list.get(3);
			W = list.get(4);
			Tp = list.get(5);
			N = list.get(6);
			MA = list.get(7);
			TA = list.get(8);
			A = list.get(9);
			AD = list.get(10);
			PR = list.get(11);
		} else {
			throw new UnsupportedOperationException("Not enough args to create orbital elements horizons' result");
		}
	}

	public String getEC() {
		return EC;
	}

	public String getQR() {
		return QR;
	}

	public String getIN() {
		return IN;
	}

	public String getOM() {
		return OM;
	}

	public String getW() {
		return W;
	}

	public String getTp() {
		return Tp;
	}

	public String getN() {
		return N;
	}

	public String getMA() {
		return MA;
	}

	public String getTA() {
		return TA;
	}

	public String getA() {
		return A;
	}

	public String getAD() {
		return AD;
	}

	public String getPR() {
		return PR;
	}

}
