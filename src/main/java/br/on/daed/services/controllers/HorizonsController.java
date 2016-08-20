/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.controllers;

import br.on.daed.services.horizons.HorizonsInterface;
import br.on.daed.services.horizons.objects.HorizonsResultCollection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author csiqueira
 */
@RestController
@RequestMapping("/horizons")
public class HorizonsController {
	
	@Autowired
	private HorizonsInterface horizonsInterface;
	
	@RequestMapping("/sdm")
	public HorizonsResultCollection getStandardDynamicalModel(@RequestParam Double jd) {
		return horizonsInterface.getStandardDynamicalModel(jd);
	}
	
}