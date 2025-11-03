# Jovian Satellites Ephemeris Migration

## Previous Behaviour

- The Java service proxied NASA’s Horizons batch CGI (`https://ssd.jpl.nasa.gov/horizons_batch.cgi`) through `HorizonsInterface`.
- `/horizons/jupiter-satellites-model?jd=<value>` submitted a POST request with `TABLE_TYPE=CARTESIAN`, `CENTER='500@5'`, and the list of bodies `{SUN, IO, EUROPA, GANYMEDE, CALLISTO}` plus Earth.
- The ASCII response was parsed with regular expressions and converted into JSON objects containing the position and velocity components (`x`, `y`, `z`, `vx`, `vy`, `vz`) expressed in AU/AU-day. Masses (Solar units) and radii (AU) were added when Horizons exposed them.
- The front-end consumed this payload to seed the WebGL visualisation (`ON_DAED["3D"].JupiterSatelites`). Without Horizons, the application cannot draw orbit traces or highlight the shadow/occultation geometry.

## New Approach

- Replace the external dependency with a deterministic, local ephemeris service implemented in .NET.
- Model the Sun, Earth, and the four Galilean moons using Keplerian elements referenced to the J2000 epoch:
  - Circular/semi-major-axis orbits expressed in AU.
  - Inclinations relative to Jupiter’s equatorial plane.
  - Mean longitudes at epoch derived from published values (Meeus/NASA fact sheets).
  - Constant angular rates (`2π / period`) to evolve the mean longitude for any Julian Day.
- Produce the same JSON contract (`HorizonsResultCollection` with `op = "CARTESIAN"`) so existing JavaScript continues to operate.
- Keep masses/radii in Solar/AU units using published physical constants.
- Expose the implementation behind `IJovianEphemerisService` and register it with DI. The new `HorizonsController` simply validates the Julian Day and returns the synthesized state vectors.
- Parity tests will be extended later with integration checks comparing a baseline Horizons dump to the local solver to quantify deviations.

## Follow-up Ideas

- Swap the simple two-body solver for SPICE kernels once licensing and build-time kernel distribution are settled.
- Extend the same infrastructure to `/horizons/elements`, `/horizons/vectors`, and `/horizons/sdm` so the migration can decommission the remaining Horizons calls.
- Add automated regression fixtures covering key Julian Dates (e.g., J2000, present day) to ensure future refactors retain numerical stability.
