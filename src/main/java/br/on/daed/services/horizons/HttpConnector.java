/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package br.on.daed.services.horizons;

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

/**
 *
 * @author csiqueira
 */
public class HttpConnector {

	private final String HORIZONS_BATCH_URL = "http://ssd.jpl.nasa.gov/horizons_batch.cgi";
	private final Pattern HORIZONS_DATA_PATTERN = Pattern.compile("(?:\\$\\$SOE)(?<data>[^$]*)");
	private final Pattern HORIZONS_ORBITAL_DATA_PATTERN = Pattern.compile("(?:(EC|OM|N |A |QR|W |MA|AD|IN|Tp|TA|PR)=[ ]*)([^ ]*)");
	private final Pattern HORIZONS_CARTESIAN_DATA_PATTERN = Pattern.compile("((?:[ ]+)[0-9.E+-]+){3}");
	private final HttpClient client = HttpClientBuilder.create().build();

	public Object query(HorizonsID id, HorizonsOptions op, Double jd) {

		Object ret = null;

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
					result.append(line).append("\n");
				}

				Matcher m = HORIZONS_DATA_PATTERN.matcher(result);

				if (m.find()) {
					String data = m.group("data");

					if (op == HorizonsOptions.ORBITAL_ELEMENTS) {
						ret = parseOrbital(data);
					} else {
						ret = parseCartesian(data);
					}

				}

			} catch (Exception e) {
				ret = null;
			}
		}

		return ret;
	}

	private String parseOrbital(String raw) {
		String ret = "";

		Matcher m = HORIZONS_ORBITAL_DATA_PATTERN.matcher(raw);

		while (m.find()) {
			ret += m.group(2) + "\n";
		}

		if (ret.isEmpty()) {
			ret = null;
		}

		return ret;
	}

	private String parseCartesian(String raw) {
		String ret = "";

		Matcher m = HORIZONS_CARTESIAN_DATA_PATTERN.matcher(raw);

		if (m.find()) {
			String[] split = m.group(0).split("[ ]+");
			ret += "position:\n";
			ret += "x: " + split[1] + "\n";
			ret += "y: " + split[2] + "\n";
			ret += "z: " + split[3] + "\n";

			if (m.find()) {
				split = m.group(0).split("[ ]+");
				ret += "velocity:\n";
				ret += "x: " + split[1] + "\n";
				ret += "y: " + split[2] + "\n";
				ret += "z: " + split[3] + "\n";
			} else {
				ret = null;
			}

		} else {
			ret = null;
		}

		return ret;
	}
}
