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

	private final String HORIZONS_BATCH_URL = "https://ssd.jpl.nasa.gov/horizons_batch.cgi";

	private final Pattern HORIZONS_DATA_PATTERN = Pattern.compile("(?:\\$\\$SOE)(?<data>[^$]*)");
	private final Pattern HORIZONS_ORBITAL_DATA_PATTERN = Pattern.compile("(?:(EC|OM|N |A |QR|W |MA|AD|IN|Tp|TA|PR)=[ ]*)([^ ]*)");
	private final Pattern HORIZONS_CARTESIAN_DATA_PATTERN = Pattern.compile("((?:[ ]+)[0-9.E+-]+){3}");

	// optional data
	private final Pattern HORIZONS_GM_PATTERN = Pattern.compile("(?:^|\\s)+GM(?:\\s*\\,?\\s*\\(?)(?<unit>[0-9^]+)?(?:[a-z^0-9- /]+)?(?:\\)?(?:[a-z^0-9- /]+)?\\s*)?=\\s*(?<gm>\\S+)(?:$|\\s{2,})");
	private final Pattern HORIZONS_RADIUS_PATTERN = Pattern.compile("(?:^|\\s+)(?:(?:RAD=)|(?:(?:R|r)adius[^=]*=))\\s+(?!km)(?<radius>[0-9.,E^]+)");
	private final Pattern HORIZONS_MASS_PATTERN = Pattern.compile("(?:^|\\s*)(?:Mass[^(]*\\(?)(?<unit>[0-9^]+)?(?:[^=~]*(?:=|~)\\s*)(?<mass>[0-9.,E]+)(?:\\s*)(?:\\(?(?!\\+-)\\s*(?<postunit>10\\^[0-9-]+)\\)?)?");

	private final HttpClient client = HttpClientBuilder.create().build();

	public HorizonsResult query(Object id, String name, HorizonsCenter center, HorizonsOptions op, Double jd) {

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
				urlParameters.add(new BasicNameValuePair("CENTER", center.toString()));
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

		// found gm
		if (m.find()) {
			String unit = m.group("unit");
			if (unit != null) {
				unit = unit.replace("10^", "1E");
			} else {
				unit = "";
			}

			try {
				String numbers = m.group("gm");
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
			try {
				String unit = m.group("unit");
				if (unit != null) {
					unit = unit.replace("10^", "1E");
				} else {
					unit = "";
				}

				String numbers = m.group("mass");
				numbers = numbers.replace(",", "");
				double massKG = Double.parseDouble(numbers + unit); // in KG

				String postUnit = m.group("postunit");
				if (postUnit != null) {
					postUnit = postUnit.replace("10^", "1E");
					try {
						double postMultiplier = Double.parseDouble(postUnit);
						massKG *= postMultiplier;
					} catch (Exception e) {
					}
				}

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
			try {
				String numbers = m.group("radius"); // in km
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
		if (!foundMass) {
			findOptionalMass(result, ret);
		}
		findOptionalRadius(result, ret);
	}

	public static void main(String args[]) {
		Pattern compile = Pattern.compile("(?:^|\\s*)(?:Mass[^(]*\\(?)(?<unit>[0-9^]+)?(?:[^=~]*(?:=|~)\\s*)(?<mass>[0-9.,E]+)(?:\\s*)(?:\\((?!.*\\+-)(?<postunit>.*\\^.*)\\))?");

		Matcher matcher = compile.matcher("*******************************************************************************\n"
				+ " Revised: Sep 28, 2012             Deimos / (Mars)                          402\n"
				+ "\n"
				+ " SATELLITE PHYSICAL PROPERTIES:\n"
				+ "  Radius (km)             = 7.8 x 6.0 x 5.1 Density (g cm^-3)   =  1.76 +- 0.30\n"
				+ "  Mass (10^20 kg )        = 1.80 (10^-5)    Geometric Albedo    =  0.06 \n"
				+ "                               (+- 0.15)    V(1,0)              = +12.89\n"
				+ "\n"
				+ " SATELLITE ORBITAL DATA:\n"
				+ "  Semi-major axis, a (km) = 23.4632(10^3)   Orbital period      = 1.263 d\n"
				+ "  Eccentricity, e         =  0.00033        Rotational period   = Synchronous\n"
				+ "  Inclination, i  (deg)   =  1.791\n"
				+ "*******************************************************************************\n"
				+ " \n"
				+ " \n"
				+ "*******************************************************************************\n"
				+ "Ephemeris / WWW_USER Thu Aug 25 13:58:15 2016 Pasadena, USA      / Horizons    \n"
				+ "*******************************************************************************\n"
				+ "Target body name: Deimos (402)                    {source: mar097}\n"
				+ "Center body name: Sun (10)                        {source: mar097}\n"
				+ "Center-site name: BODY CENTER\n"
				+ "*******************************************************************************\n"
				+ "Start time      : A.D. 2000-Jan-01 00:00:00.0000 TDB\n"
				+ "Stop  time      : A.D. 2000-Jan-02 00:00:00.0000 TDB\n"
				+ "Step-size       : 597600 minutes\n"
				+ "*******************************************************************************\n"
				+ "Center geodetic : 0.00000000,0.00000000,0.0000000 {E-lon(deg),Lat(deg),Alt(km)}\n"
				+ "Center cylindric: 0.00000000,0.00000000,0.0000000 {E-lon(deg),Dxy(km),Dz(km)}\n"
				+ "Center radii    : 696000.0 x 696000.0 x 696000.0 k{Equator, meridian, pole}    \n"
				+ "System GM       : 2.9591220828559109E-04 au^3/d^2\n"
				+ "Output units    : AU-D, deg, Julian day number (Tp)                            \n"
				+ "Output format   : 10\n"
				+ "Reference frame : ICRF/J2000.0                                                 \n"
				+ "Output type     : GEOMETRIC osculating elements\n"
				+ "Coordinate systm: Ecliptic and Mean Equinox of Reference Epoch                 \n"
				+ "*******************************************************************************\n"
				+ "JDTDB\n"
				+ "   EC    QR   IN\n"
				+ "   OM    W    Tp\n"
				+ "   N     MA   TA\n"
				+ "   A     AD   PR\n"
				+ "*******************************************************************************\n"
				+ "$$SOE\n"
				+ "2451544.500000000 = A.D. 2000-Jan-01 00:00:00.0000 (TDB)\n"
				+ " EC= 2.326887802497893E-02 QR= 1.337811007124899E+00 IN= 2.139216386111699E+00\n"
				+ " OM= 4.083435138741744E+01 W = 1.857454986387542E+02 Tp=  2451332.176361185033\n"
				+ " N = 6.148574868705978E-01 MA= 1.305487789649286E+02 TA= 1.325368384195841E+02\n"
				+ " A = 1.369681969813503E+00 AD= 1.401552932502106E+00 PR= 5.855015311471115E+02\n"
				+ "$$EOE\n"
				+ "*******************************************************************************\n"
				+ "Coordinate system description:\n"
				+ "\n"
				+ "  Ecliptic and Mean Equinox of Reference Epoch\n"
				+ "\n"
				+ "    Reference epoch: J2000.0\n"
				+ "    xy-plane: plane of the Earth's orbit at the reference epoch\n"
				+ "    x-axis  : out along ascending node of instantaneous plane of the Earth's\n"
				+ "              orbit and the Earth's mean equator at the reference epoch\n"
				+ "    z-axis  : perpendicular to the xy-plane in the directional (+ or -) sense\n"
				+ "              of Earth's north pole at the reference epoch.\n"
				+ "\n"
				+ "Symbol meaning [1 au=149597870.700 km, 1 day=86400.0 s]:\n"
				+ "\n"
				+ "    JDTDB    Epoch Julian Date, Barycentric Dynamical Time\n"
				+ "      EC     Eccentricity, e                                                   \n"
				+ "      QR     Periapsis distance, q (AU)                                        \n"
				+ "      IN     Inclination w.r.t xy-plane, i (degrees)                           \n"
				+ "      OM     Longitude of Ascending Node, OMEGA, (degrees)                     \n"
				+ "      W      Argument of Perifocus, w (degrees)                                \n"
				+ "      Tp     Time of periapsis (Julian day number)                             \n"
				+ "      N      Mean motion, n (degrees/day)                                      \n"
				+ "      MA     Mean anomaly, M (degrees)                                         \n"
				+ "      TA     True anomaly, nu (degrees)                                        \n"
				+ "      A      Semi-major axis, a (AU)                                           \n"
				+ "      AD     Apoapsis distance (AU)                                            \n"
				+ "      PR     Sidereal orbit period (day)                                       \n"
				+ "\n"
				+ "Geometric states/elements have no aberration corrections applied.\n"
				+ "\n"
				+ " Computations by ...\n"
				+ "     Solar System Dynamics Group, Horizons On-Line Ephemeris System\n"
				+ "     4800 Oak Grove Drive, Jet Propulsion Laboratory\n"
				+ "     Pasadena, CA  91109   USA\n"
				+ "     Information: http://ssd.jpl.nasa.gov/\n"
				+ "     Connect    : telnet://ssd.jpl.nasa.gov:6775  (via browser)\n"
				+ "                  telnet ssd.jpl.nasa.gov 6775    (via command-line)\n"
				+ "     Author     : Jon.Giorgini@jpl.nasa.gov\n"
				+ "*******************************************************************************\n"
				+ "\n"
				+ "!$$SOF\n"
				+ "OBJ_DATA = YES\n"
				+ "CENTER = 10\n"
				+ "COMMAND = 402\n"
				+ "MAKE_EPHEM = YES\n"
				+ "OUT_UNITS = AU-D\n"
				+ "TABLE_TYPE = ELEM\n"
				+ "START_TIME = JD2451544.5\n"
				+ "STOP_TIME = JD2451545.5\n"
				+ "STEP_SIZE = 415d");

		matcher.find();

		String group = matcher.group("postunit");

		System.out.println(group);
	}

}
