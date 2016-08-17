package br.on.daed.services.horizons;

/**
 *
 * @author csiqueira
 */
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.net.telnet.TelnetClient;
import org.springframework.stereotype.Service;

@Service
public class TelnetConnector {

	private final String[] HORIZON_SCREEN_REGEX
			= {
				".*Horizons> $",
				".*Continue \\[ <cr>=yes, n=no, \\? \\] : $",
				".*Select ... \\[A\\]pproaches, \\[E\\]phemeris, \\[F\\]tp,\\[M\\]ail,\\[R\\]edisplay, \\[S\\]PK,\\?,<cr>: $",
				".*Observe, Elements, Vectors  \\[o,e,v,\\?\\] : $",
				".*\\? \\] : $",
				".*Reference plane \\[eclip, frame, body \\] : $",
				".*Starting CT  \\[>=   1599-Dec-12 00:00\\] : $",
				".*Ending   CT  \\[<=   2500-Dec-31 00:00\\] : $",
				".*Output interval \\[ex: 10m, 1h, 1d, \\? \\] : $",
				".*Accept default output \\[ cr=\\(y\\), n, \\?\\] : $",
				".* >>> Select... \\[A\\]gain, \\[N\\]ew-case, \\[F\\]tp, \\[K\\]ermit, \\[M\\]ail, \\[R\\]edisplay, \\? : $"
			};

	private final Pattern[] HORIZON_SCREEN_PATTERN = new Pattern[HORIZON_SCREEN_REGEX.length];

	private Pattern HORIZON_DATA_PATTERN = null;

	private TelnetClient tc = null;
	private final String REMOTE_ADDR = "horizons.jpl.nasa.gov";
	private final int REMOTE_PORT = 6775;

	public TelnetConnector() {
		tc = new TelnetClient();

		for (int i = 0; i < HORIZON_SCREEN_REGEX.length; i++) {
			HORIZON_SCREEN_PATTERN[i] = Pattern.compile(HORIZON_SCREEN_REGEX[i]);
		}

		HORIZON_DATA_PATTERN = Pattern.compile("(?:\\$\\$SOE)(?<data>[^$]*)");
	}

	private String readUntilRegex(Pattern p) throws Exception {

		String ret = null;

		InputStream instr = tc.getInputStream();

		try {
			ret = "";
			byte[] buff = new byte[1024];
			int ret_read = 0;

			do {
				ret_read = instr.read(buff);
				if (ret_read > 0) {
					ret += new String(buff, 0, ret_read);
				} else {
					ret = null;
				}
			} while (ret != null && !p.matcher(ret).find());

		} catch (IOException e) {
			ret = null;
		}

		if (ret == null) {
			throw new Exception("Error while reading data");
		}

		return ret;
	}

	private void sendString(String str, boolean retrieveEcho) throws Exception {

		OutputStream outstr = tc.getOutputStream();

		if (str != null) {
			byte[] buff = str.getBytes();
			outstr.write(buff, 0, buff.length);
			outstr.flush();
			if (retrieveEcho) {
				readUntilRegex(Pattern.compile(str)); // Horizons echo inputs back
			}
		} else {
			throw new Exception("Error while writing to telnet");
		}

	}

	public Object query() {
		String ret = null;

		try {
			tc.connect(REMOTE_ADDR, REMOTE_PORT);

			String output;

			readUntilRegex(HORIZON_SCREEN_PATTERN[0]);
			sendString("APOPHIS", true); // get body "APOPHIS"
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
			sendString("\r\n", false); // confirms result
			readUntilRegex(HORIZON_SCREEN_PATTERN[2]);
			sendString("E", true); // get ephemerides
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[3]);
			sendString("E", true); // get orbital elements
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[4]);
			sendString("sun", true); // set it to heliocentric, on future it is needed to send 'y' to repeat last center used
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[5]);
			sendString("frame", true); // use J2000
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[6]);
			sendString("JD2454441.5", true); // start date on 2454441.5
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[7]);
			sendString("JD2454442.5", true); // end date on 2454441.5
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[8]);
			sendString("5d", true); // 5 day interval
			sendString("\r\n", false);
			readUntilRegex(HORIZON_SCREEN_PATTERN[9]);
			sendString("\r\n", false); // confirm input data
			output = readUntilRegex(HORIZON_SCREEN_PATTERN[10]);

			Matcher m = HORIZON_DATA_PATTERN.matcher(output);

			m.find();

			System.out.println(m.group("data"));

			tc.disconnect();
		} catch (Exception e) {
		}

		return ret;
	}

	public static void main(String[] args) throws Exception {
		TelnetConnector conn = new TelnetConnector();
		conn.query();
	}
	
}
