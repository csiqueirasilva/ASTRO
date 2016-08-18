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
				urlParameters.add(new BasicNameValuePair("REF_PLANE", "FRAME"));
				urlParameters.add(new BasicNameValuePair("START_TIME", "JD" + jd));
				urlParameters.add(new BasicNameValuePair("STOP_TIME", "JD" + (jd + 1)));
				urlParameters.add(new BasicNameValuePair("STEP_SIZE", "5d"));
				urlParameters.add(new BasicNameValuePair("OUT_UNITS", "AU-D"));
				
				request.setEntity(new UrlEncodedFormEntity(urlParameters));

				HttpResponse response = client.execute(request);
				System.out.println("Response Code : "
						+ response.getStatusLine().getStatusCode());

				BufferedReader rd = new BufferedReader(
						new InputStreamReader(response.getEntity().getContent()));

				StringBuffer result = new StringBuffer();
				String line = "";
				while ((line = rd.readLine()) != null) {
					result.append(line).append("\n");
				}

				Matcher m = HORIZONS_DATA_PATTERN.matcher(result);

				if(m.find()) {
					ret = m.group("data");
				}
				
			} catch (Exception e) {
				ret = null;
			}
		}
		
		return ret;
	}
}
