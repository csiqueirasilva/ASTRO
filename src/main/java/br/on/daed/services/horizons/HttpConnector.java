/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons;

import br.on.daed.services.horizons.objects.CartesianCoordinates;
import br.on.daed.services.horizons.objects.HorizonsResult;
import br.on.daed.services.horizons.objects.OrbitalElements;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import static org.apache.http.HttpHeaders.USER_AGENT;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.message.BasicNameValuePair;
import org.springframework.stereotype.Service;

/**
 *
 * @author csiqueira
 */
@Service
public class HttpConnector {

	private final String HORIZONS_BATCH_URL = "http://ssd.jpl.nasa.gov/horizons_batch.cgi";

	private final Pattern HORIZONS_DATA_PATTERN = Pattern.compile("(?:\\$\\$SOE)(?<data>[^$]*)");
	private final Pattern HORIZONS_ORBITAL_DATA_PATTERN = Pattern.compile("(?:(EC|OM|N |A |QR|W |MA|AD|IN|Tp|TA|PR)=[ ]*)([^ ]*)");
	private final Pattern HORIZONS_CARTESIAN_DATA_PATTERN = Pattern.compile("((?:[ ]+)[0-9.E+-]+){3}");

	// optional data
	private final Pattern HORIZONS_GM_PATTERN = Pattern.compile("(?:^\\s*)?GM(?:\\s*\\,?\\s*\\(?)(?<unit>[0-9^]+)?(?:[a-z^0-9- /]+)?(?:\\)?(?:[a-z^0-9- /]+)?\\s*)?=\\s*(?<GM>\\S+)(?:$|\\s{2,})");
	private final Pattern HORIZONS_RADIUS_PATTERN = Pattern.compile("(?:^|\\s+)(?:(?:RAD=)|(?:(?:R|r)adius[^=]*=))\\s+(?!km)(?<radius>[0-9.,E^]+)");
	private final Pattern HORIZONS_MASS_PATTERN = Pattern.compile("(?:^|\\s+)(?:Mass[^(]*\\(?)(?<unit>[0-9^]+)?(?:[^=~]*(?:=|~)\\s*)(?<mass>[0-9.,E]+)");

	private final HttpClient client = HttpClientBuilder.create().build();

	public HorizonsResult query(Object id, String name, HorizonsOptions op, Double jd) {

		HorizonsResult ret = null;

		if (id != null && op != null && jd != null) {

			try {

				HttpPost request = new HttpPost(HORIZONS_BATCH_URL);

				// add header
				request.setHeader("User-Agent", USER_AGENT);

				List<NameValuePair> urlParameters = new ArrayList<NameValuePair>();
				urlParameters.add(new BasicNameValuePair("batch", "1"));
				urlParameters.add(new BasicNameValuePair("COMMAND", id.toString()));
				urlParameters.add(new BasicNameValuePair("MAKE_EPHEM", "YES"));
				urlParameters.add(new BasicNameValuePair("CENTER", "500@10")); // SUN, HELIOCENTRIC COORDS
				urlParameters.add(new BasicNameValuePair("TABLE_TYPE", op.toString()));
				urlParameters.add(new BasicNameValuePair("REF_PLANE", "ECLIPTIC"));
				urlParameters.add(new BasicNameValuePair("START_TIME", "JD" + jd));
				urlParameters.add(new BasicNameValuePair("STOP_TIME", "JD" + (jd + 1)));
				urlParameters.add(new BasicNameValuePair("STEP_SIZE", "5d"));
				urlParameters.add(new BasicNameValuePair("OUT_UNITS", "AU-D"));

				request.setEntity(new UrlEncodedFormEntity(urlParameters));

				HttpResponse response = client.execute(request);

				BufferedReader rd = new BufferedReader(
						new InputStreamReader(response.getEntity().getContent()));

				StringBuffer result = new StringBuffer();
				String line = "";

				while ((line = rd.readLine()) != null) {
					result.append(line);
				}

				Matcher m = HORIZONS_DATA_PATTERN.matcher(result);

				if (m.find()) {
					String data = m.group("data");

					ret = parseResults(data, op);

					if (ret != null) {
						ret.setId(id);
						ret.setName(name);

						matchOptionalParameters(result, ret);
					}
				}

			} catch (Exception e) {
				ret = null;
			}
		}

		return ret;
	}

	private HorizonsResult parseResults(String data, HorizonsOptions op) {

		HorizonsResult ret;

		if (op == HorizonsOptions.ORBITAL_ELEMENTS) {
			ret = new OrbitalElements(parseOrbital(data));
		} else /* vector, cartesian */ {
			ret = new CartesianCoordinates(parseCartesian(data));
		}

		return ret;
	}

	private List<String> parseOrbital(String raw) {
		List<String> ret = new ArrayList<>();

		Matcher m = HORIZONS_ORBITAL_DATA_PATTERN.matcher(raw);

		while (m.find()) {
			ret.add(m.group(2));
		}

		if (ret.isEmpty()) {
			ret = null;
		}

		return ret;
	}

	private List<String> parseCartesian(String raw) {
		List<String> ret = new ArrayList<>();

		Matcher m = HORIZONS_CARTESIAN_DATA_PATTERN.matcher(raw);

		if (m.find()) {

			String[] split = m.group(0).split("[ ]+");

			ret.add(split[1]);
			ret.add(split[2]);
			ret.add(split[3]);

			if (m.find()) {
				split = m.group(0).split("[ ]+");
				ret.add(split[1]);
				ret.add(split[2]);
				ret.add(split[3]);
			} else {
				ret = null;
			}

		} else {
			ret = null;
		}

		return ret;
	}

	private boolean findOptionalGM(StringBuffer result, HorizonsResult ret) {
		boolean flag = false;
		Matcher m = HORIZONS_GM_PATTERN.matcher(result);

		// found mass
		if (m.find()) {
			String unit = m.group("unit");
			if (unit != null) {
				unit = unit.replace("^", "E");
			} else {
				unit = "";
			}

			String numbers = m.group("gm");

			try {
				numbers = numbers.replace(",", "");
				double gm = Double.parseDouble(numbers + unit); // in km^3/sec^2
				double finalMass = HorizonsInterface.gmToMass(gm);
				ret.setMass(finalMass);
				flag = true;
			} catch (Exception e) {
			}
		}
		
		return flag;
	}
	
	private void findOptionalMass(StringBuffer result, HorizonsResult ret) {
		Matcher m = HORIZONS_MASS_PATTERN.matcher(result);

		// found mass
		if (m.find()) {
			String unit = m.group("unit");
			if (unit != null) {
				unit = unit.replace("^", "E");
			} else {
				unit = "";
			}

			String numbers = m.group("mass");

			try {
				numbers = numbers.replace(",", "");
				double massKG = Double.parseDouble(numbers + unit); // in KG
				double finalMass = HorizonsInterface.kgToSunMass(massKG);
				ret.setMass(finalMass);
			} catch (Exception e) {
			}

		}
	}

	private void findOptionalRadius(StringBuffer result, HorizonsResult ret) {
		Matcher m = HORIZONS_RADIUS_PATTERN.matcher(result);

		// found radius
		if (m.find()) {
			String numbers = m.group("radius"); // in km

			try {
				numbers = numbers.replace(",", "");
				double radiusKM = Double.parseDouble(numbers); // in KM
				double finalRadius = HorizonsInterface.kmToAU(radiusKM);
				ret.setRadius(finalRadius);
			} catch (Exception e) {
			}

		}
	}
	
	private void matchOptionalParameters(StringBuffer result, HorizonsResult ret) {
		boolean foundMass = findOptionalGM(result, ret);
		if(!foundMass) {
			findOptionalMass(result, ret);
		}
		findOptionalRadius(result, ret);
	}

}
