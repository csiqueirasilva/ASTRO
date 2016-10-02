/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons;

import br.on.daed.services.horizons.objects.HorizonsResult;
import br.on.daed.services.horizons.objects.HorizonsResultCollection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 *
 * @author csiqueira
 */
@Service
public class HorizonsInterface {
	
	private static final double MIN_JD = 2444240.0;
	private static final double MAX_JD = 2480765.0;
	
	private static final double KM_SEC_TO_AU_DAY = 448485856027460.06;
	private static final double AU_KM = 149597870.700;
	private static final double SUN_MASS_KG = 1.989E30;
	
	private static final double G = 2.9591293263082414E-04;
	
	@Autowired
	private HttpConnector tc;
	
	public static boolean validateInputDate(Double date) {
		return date != null && date >= MIN_JD && date <= MAX_JD;
	}
	
	public static double kgToSunMass(double input) {
		return input / SUN_MASS_KG;
	}
	
	public static double kmSecToAUDay(double input) {
		return input / KM_SEC_TO_AU_DAY;
	}
	
	public static double kmToAU (double input) {
		return input / AU_KM;
	} 
	
	public static double gmToMass (double GM) {
		return kmSecToAUDay(GM) / G;
	}
	
	public HorizonsResultCollection fecthResultCollection(Double JD, HorizonsCenter center, HorizonsOptions op, HorizonsID[] ids) {
		Object[] arrIds = new Object[ids.length];
		String[] arrNames = new String[ids.length];
		
		for(int i = 0; i < ids.length; i++) {
			arrIds[i] = ids[i].getValue();
			arrNames[i] = ids[i].name();
		}
		
		return fecthResultCollection(JD, center, op, arrIds, arrNames);
	}
	
	public HorizonsResultCollection fecthResultCollection(Double JD, HorizonsCenter center, HorizonsOptions op, Object[] ids, String[] names) {
		HorizonsResultCollection ret = null;
		
		if(validateInputDate(JD) && op != null && ids != null && ids.length > 0 && ids.length == names.length) {

			ret = new HorizonsResultCollection();

			ret.setJd(JD);
			ret.setOp(op);

			for(int i = 0; i < ids.length; i++) {
				HorizonsResult query = tc.query(ids[i], names[i], center, op, JD);
				if(query == null) {
					throw new UnsupportedOperationException("Error while getting data from Horizons to assemble ResultCollection");
				}
				ret.add(query);
			}
		
		}
		
		return ret;
	}
	
	public HorizonsResultCollection getElements(Object id, String name, Double JD) {
		String[] arrNames = {name};
		Object[] arrIds = {id};
		
		return fecthResultCollection(JD, HorizonsCenter.SSB, HorizonsOptions.ORBITAL_ELEMENTS, arrIds, arrNames);
	}
	
	public HorizonsResultCollection getVectors(Object id, String name, Double JD) {
		String[] arrNames = {name};
		Object[] arrIds = {id};
		
		return fecthResultCollection(JD, HorizonsCenter.SSB, HorizonsOptions.CARTESIAN, arrIds, arrNames);
	}
	
	public HorizonsResultCollection getStandardDynamicalModel (Double JD) {

		// REF J2000 = 2451544.5;
		
		HorizonsOptions op = HorizonsOptions.ORBITAL_ELEMENTS;
		
		HorizonsID[] values = {
			HorizonsID.MERCURY,
			HorizonsID.VENUS,
			HorizonsID.EARTH,
			HorizonsID.MARS,
			HorizonsID.JUPITER,
			HorizonsID.SATURN,
			HorizonsID.NEPTUNE,
			HorizonsID.URANUS,
			HorizonsID.CERES,
			HorizonsID.VESTA,
			HorizonsID.PALLAS
		};

		HorizonsResultCollection ret = this.fecthResultCollection(JD, HorizonsCenter.SSB, op, values);

		return ret;
	}
	
	public HorizonsResultCollection getJupiterModel (Double JD) {
		
		HorizonsOptions op = HorizonsOptions.ORBITAL_ELEMENTS;
		
		HorizonsID[] values = {
			HorizonsID.SUN,
			HorizonsID.IO,
			HorizonsID.EUROPA,
			HorizonsID.GANYMEDE,
			HorizonsID.CALLISTO
		};

		HorizonsResultCollection ret = this.fecthResultCollection(JD, HorizonsCenter.JUPITER, op, values);

		return ret;
	}
	
}