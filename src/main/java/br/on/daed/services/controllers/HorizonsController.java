package br.on.daed.services.controllers;

import br.on.daed.services.horizons.HorizonsInterface;
import br.on.daed.services.horizons.objects.HorizonsResultCollection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author csiqueira
 */
@RestController
@RequestMapping("/horizons")
@CrossOrigin
public class HorizonsController {

	@Autowired
	private HorizonsInterface horizonsInterface;

	@RequestMapping("/sdm")
	public HorizonsResultCollection getStandardDynamicalModel(@RequestParam Double jd) {
		HorizonsResultCollection ret = null;
		try {
			ret = horizonsInterface.getStandardDynamicalModel(jd);
		} catch (UnsupportedOperationException e) {
		}
		return ret;
	}

	@RequestMapping("/elements")
	public HorizonsResultCollection getElements(@RequestParam Object id, @RequestParam Double jd) {
		HorizonsResultCollection ret = null;
		try {
			ret = horizonsInterface.getElements(id, null, jd);
		} catch (UnsupportedOperationException e) {
		}
		return ret;
	}

	@RequestMapping("/vectors")
	public HorizonsResultCollection getVectors(@RequestParam Object id, @RequestParam Double jd) {
		HorizonsResultCollection ret = null;
		try {
			ret = horizonsInterface.getVectors(id, null, jd);
		} catch (UnsupportedOperationException e) {
		}
		return ret;
	}

}
