package br.on.daed.services.horizons;

/**
 *
 * @author csiqueira
 */
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.net.telnet.EchoOptionHandler;
import org.apache.commons.net.telnet.InvalidTelnetOptionException;
import org.apache.commons.net.telnet.SuppressGAOptionHandler;

import org.apache.commons.net.telnet.TelnetClient;
import org.apache.commons.net.telnet.TerminalTypeOptionHandler;
import org.springframework.stereotype.Service;

@Service
public class TelnetConnector {

	private final String[] HORIZON_SCREEN_REGEX
			= {
				".*Horizons> $",
				".*: $",
			};

	private final Pattern[] HORIZON_SCREEN_PATTERN = new Pattern[HORIZON_SCREEN_REGEX.length];

	private Pattern HORIZON_DATA_PATTERN = null;

	private int queryCount = 0;
	private TelnetClient tc = null;
	private final String REMOTE_ADDR = "horizons.jpl.nasa.gov";
	private final int REMOTE_PORT = 6775;

	public TelnetConnector() {
		tc = new TelnetClient();

		TerminalTypeOptionHandler ttopt = new TerminalTypeOptionHandler("VT100", false, false, true, false);
        EchoOptionHandler echoopt = new EchoOptionHandler(true, false, true, false);
        SuppressGAOptionHandler gaopt = new SuppressGAOptionHandler(true, true, true, true);

        try
        {
            tc.addOptionHandler(ttopt);
            tc.addOptionHandler(echoopt);
            tc.addOptionHandler(gaopt);
        }
        catch (InvalidTelnetOptionException | IOException e)
        {
            System.err.println("Error registering option handlers: " + e.getMessage());
        }
		
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

	public boolean open() {
		boolean ret = true;
		try {
			queryCount = 0;
			tc.connect(REMOTE_ADDR, REMOTE_PORT);
		} catch (IOException ex) {
			ret = false;
		} catch (Exception ex) {
			Logger.getLogger(TelnetConnector.class.getName()).log(Level.SEVERE, null, ex);
		}
		return ret;
	}

	public boolean close() {
		boolean ret = true;
		try {
			tc.disconnect();
		} catch (IOException ex) {
			ret = false;
		}
		return ret;
	}

	public Object query(Object bodyId, HorizonsOptions ho, Double jd) {
		String ret = null;

		if (tc.isConnected() && bodyId != null && ho != null && jd != null) {

			try {

				String output;

				sendString("\r\n", false); // prevents XTERM bug
				sendString("\r\n", false); // prevents XTERM bug

				output = readUntilRegex(HORIZON_SCREEN_PATTERN[0]);
				sendString(bodyId.toString(), true); // get body
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString("E", true); // get ephemerides
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString(ho.toString(), true); // get orbital elements or cartesian vector
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				
				String center = "sun";
				
				if(queryCount != 0) {
					center = "y";
				}
				
				sendString(center, true); // set it to heliocentric, on future it is needed to send 'y' to repeat last center used
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString("frame", true); // use J2000
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString("JD" + jd, true); // start date on jd
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString("JD" + (jd + 1), true); // end date on jd + 1
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString("5d", true); // 5 day interval, to skip end date and return only set of data
				sendString("\r\n", false);
				readUntilRegex(HORIZON_SCREEN_PATTERN[1]);
				sendString("\r\n", false); // confirm input data
				output = readUntilRegex(HORIZON_SCREEN_PATTERN[1]);

				Matcher m = HORIZON_DATA_PATTERN.matcher(output);

				m.find();

				ret = m.group("data");

				sendString("n", true); // return to main screen
				sendString("\r\n", false);

			} catch (Exception e) {
			}

		}

		return ret;
	}

}
