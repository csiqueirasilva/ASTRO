(function () {

    // private
    var radian = Math.PI / 180;
    var degree = 180 / Math.PI;
    var UA = 149597871; // in km

	if(ON_DAED === undefined) {
		ON_DAED = {};
	}
	
    ON_DAED["ASTRO"] = {};

    ON_DAED["ASTRO"].CoordinateType = {
        HORIZONTAL: 1,
        EQUATORIAL: 2,
        ECLIPTIC: 3,
        GALACTIC: 4,
        SUPERGALACTIC: 5,
        HOUR: 6
    };

    ON_DAED["ASTRO"].SolarSystemBody = {
        MERCURY: 'mercury',
        VENUS: 'venus',
        EARTH: 'earth',
        MARS: 'mars',
        JUPITER: 'jupiter',
        SATURN: 'saturn',
        URANUS: 'uranus',
        NEPTUNE: 'neptune',
        MOON: 'moon',
        SUN: 'sun'
    };

    function equatorialToG(alphaG, deltaG, theta, alpha, delta) {
        var x = Math.atan2(
                Math.cos(delta) * Math.sin(alpha - alphaG),
                Math.cos(deltaG) * Math.sin(delta) - Math.sin(deltaG) * Math.cos(delta) * Math.cos(alpha - alphaG)
                );

        var l = theta - x;

        var b = Math.asin(
                Math.sin(deltaG) * Math.sin(delta) + Math.cos(deltaG) * Math.cos(delta) * Math.cos(alpha - alphaG)
                );

        return {
            longitude: l,
            latitude: b
        };
    }

    function gToEquatorial(alphaG, deltaG, theta, l, b) {
        var x = Math.atan2(
                Math.cos(b) * Math.sin(theta - l),
                Math.cos(deltaG) * Math.sin(b) - Math.sin(deltaG) * Math.cos(b) * Math.cos(theta - l)
                );

        var alpha = x + alphaG;

        var delta = Math.asin(
                Math.sin(deltaG) * Math.sin(b) + Math.cos(deltaG) * Math.cos(b) * Math.cos(theta - l)
                );

        return {
            rightAscension: alpha,
            declination: delta
        };
    }

    function rotateSphericalAngles(v, h, rotX, rotY, rotZ) {
        var rot1 = rotateSphericalAnglesY(v, h, rotY);
        var rot2 = rotateSphericalAnglesX(rot1.v, rot1.h, rotX);
        return rotateSphericalAnglesZ(rot2.v, rot2.h, rotZ);
    }

    function rotateSphericalAnglesY(v, h, rot) {
        var x = Math.sin(v) * Math.cos(h);
        var y = Math.sin(v) * Math.sin(h);
        var z = Math.cos(v);

        var xDash = x * Math.cos(rot) + z * Math.sin(rot);
        var yDash = y;
        var zDash = -x * Math.sin(rot) + z * Math.cos(rot);

        return {
            v: Math.acos(zDash),
            h: Math.atan2(yDash, xDash)
        };
    }

    function rotateSphericalAnglesX(v, h, rot) {
        var x = Math.sin(v) * Math.cos(h);
        var y = Math.sin(v) * Math.sin(h);
        var z = Math.cos(v);

        var xDash = x;
        var yDash = -z * Math.sin(rot) + y * Math.cos(rot);
        var zDash = z * Math.cos(rot) + y * Math.sin(rot);

        return {
            v: Math.acos(zDash),
            h: Math.atan2(yDash, xDash)
        };
    }

    function rotateSphericalAnglesZ(v, h, rot) {
        var x = Math.sin(v) * Math.cos(h);
        var y = Math.sin(v) * Math.sin(h);
        var z = Math.cos(v);

        var xDash = x * Math.cos(rot) - y * Math.sin(rot);
        var yDash = x * Math.sin(rot) + y * Math.cos(rot);
        var zDash = z;

        return {
            v: Math.acos(zDash),
            h: Math.atan2(yDash, xDash)
        };
    }

    // src: http://www.atnf.csiro.au/computing/software/gipsy/sub/skyco.c
    function applyRotationMatrix(v, h, m) {
        var x = Math.cos(h) * Math.cos(v);
        var y = Math.sin(h) * Math.cos(v);
        var z = Math.sin(v);

        var xDash = x * m[0] + y * m[1] + z * m[2];
        var yDash = x * m[3] + y * m[4] + z * m[5];
        var zDash = x * m[6] + y * m[7] + z * m[8];

        if ((xDash === 0.0) && (yDash === 0.0)) {
            h = 0.0;
            if (zDash > 0.0) {
                v = Math.PI / 2;
            }
            else {
                v = -Math.PI / 2;
            }
        } else {
            h = Math.atan2(yDash, xDash);
            v = Math.atan2(zDash, Math.sqrt(xDash * xDash + yDash * yDash));
        }

        return {
            v: v,
            h: h
        };
    }

    // src: http://www.atnf.csiro.au/computing/software/gipsy/sub/skyco.c
    function fromEquatorialToSupergalactic(alpha, delta) {
        var c = fromEquatorialToGalactic(alpha, delta);
        var l = c.longitude;
        var b = c.latitude;

        var rotMatrix = [-0.7353878609, 0.6776464374, 0.0000000000,
            -0.0745961752, -0.0809524239, 0.9939225904,
            0.6735281025, 0.7309186075, 0.1100812618];

        var rot = applyRotationMatrix(b, l, rotMatrix);

        return {
            longitude: rot.h,
            latitude: rot.v
        };
    }

    // src: http://www.atnf.csiro.au/computing/software/gipsy/sub/skyco.c
    function fromSupergalacticToEquatorial(l, b) {
        var rotMatrix = [-0.7353878609, -0.0745961752, 0.6735281025,
            0.6776464374, -0.0809524239, 0.7309186075,
            0.0000000000, 0.9939225904, 0.1100812618];

        var rot = applyRotationMatrix(b, l, rotMatrix);

        return fromGalacticToEquatorial(rot.h, rot.v);
    }

    var gRA = 192.25 * radian; // Galactic Right Ascension
    var gDeclination = 27.4 * radian; // Galactic Declination
    var gTheta = 123 * radian; // Position Angle of Galactic Center

    function fromEquatorialToGalactic(alpha, delta) {
        return equatorialToG(gRA, gDeclination, gTheta, alpha, delta);
    }

    function fromGalacticToEquatorial(l, b) {
        return gToEquatorial(gRA, gDeclination, gTheta, l, b);
    }

    function fromEquatorialToEcliptic(alpha, delta, epsilon) {
        var lambda = Math.atan2(
                Math.sin(alpha) * Math.cos(epsilon) + Math.tan(delta) * Math.sin(epsilon),
                Math.cos(alpha)
                );

        var beta = Math.asin(
                Math.sin(delta) * Math.cos(epsilon) - Math.cos(delta) * Math.sin(epsilon) * Math.sin(alpha)
                );

        return {
            longitude: lambda,
            latitude: beta,
            obliquity: epsilon
        };
    }

    function fromEclipticToEquatorial(longitude, latitude, obliquity) {
        // Chapter 12; Astronomical Algorithms; MEEUS, Jean; Pg. 89
        var rightAscension = Math.atan2(
                (Math.sin(longitude) * Math.cos(obliquity) - Math.tan(latitude) * Math.sin(obliquity)),
                Math.cos(longitude)
                );

        var declination = Math.asin(
                Math.sin(latitude) * Math.cos(obliquity) + Math.cos(latitude) * Math.sin(obliquity) * Math.sin(longitude)
                );

        return {
            rightAscension: rightAscension,
            declination: declination
        };
    }

    function fromHorizontalToEquatorial(latitude, longitude, azimute, altitude, julian) {
        azimute -= Math.PI;
        var H = Math.atan2(
                Math.sin(azimute),
                Math.cos(azimute) * Math.sin(latitude) + Math.tan(altitude) * Math.cos(latitude)
                );

        var delta = Math.sin(latitude) * Math.sin(altitude) - Math.cos(latitude) * Math.cos(altitude) * Math.cos(azimute);

        var alpha = ON_DAED.ASTRO.getRightAscension(H, longitude, julian) * radian;

        return {
            rightAscension: alpha,
            declination: delta
        };
    }

    function fromEquatorialToHorizontal(latitude, longitude, declination, rightAscension, julian) {
        var H = ON_DAED["ASTRO"].getHourAngle(rightAscension, longitude, julian) * radian;
        var A = Math.atan2(
                Math.sin(H), (Math.cos(H) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude))
                ) + Math.PI;

        var h = Math.asin(
                Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(H)
                );

        return {
            azimute: A,
            altitude: h,
            localLatitude: latitude,
            localLongitude: longitude,
            julian: julian
        };
    }

    function initialEclipseCalculation(julian, moonPhase) {
        var angles = ON_DAED.ASTRO.getNextMoonPhaseAngles(julian, moonPhase);

        var k = angles.k;
        var T = angles.T;
        var MDash = angles.MDash;
        var M = angles.M;
        var F = angles.F;
        var omega = angles.omega;
        var E = angles.E;
        var JDE = angles.JDE;

        var ret = {
            noEclipse: false
        };

        var certain = false;

        var firstInformation = Math.abs(F % 180);
        if (firstInformation < 21 || firstInformation > 180 - 21) /* There might be an Eclipse */ {
            if (firstInformation < 13.9 || firstInformation > 180 - 13.9) {
                certain = true;
            }

            if (Math.abs(F % 360) < 100) {
                ret.nearNode = "ascending";
            } else {
                ret.nearNode = "descending";
            }

            var F1 = F - 0.02665 * Math.sin(omega * radian);
            var A1 = 299.77 + 0.107408 * k - 0.009173 * T * T;

            F1 *= radian;
            A1 *= radian;
            MDash *= radian;
            M *= radian;
            F *= radian;
            omega *= radian;

            ret.MDash = MDash;
            ret.JDE = JDE;

            var acc =
                    (moonPhase === ON_DAED.ASTRO.MoonPhases.NEW ? -0.4075 : -0.4065) * Math.sin(MDash)
                    + (moonPhase === ON_DAED.ASTRO.MoonPhases.NEW ? +0.1721 : +0.1727) * E * Math.sin(M)
                    + 0.0161 * Math.sin(2 * MDash)
                    - 0.0097 * Math.sin(2 * F1)
                    + 0.0073 * E * Math.sin(MDash - M)
                    - 0.0050 * E * Math.sin(MDash + M)
                    - 0.0023 * Math.sin(MDash - 2 * F1)
                    + 0.0021 * E * Math.sin(2 * M)
                    + 0.0012 * Math.sin(MDash + 2 * F1)
                    + 0.0006 * E * Math.sin(2 * MDash + M)
                    - 0.0004 * Math.sin(3 * MDash)
                    - 0.0003 * E * Math.sin(M + 2 * F1)
                    + 0.0003 * Math.sin(A1)
                    - 0.0002 * E * Math.sin(M - 2 * F1)
                    - 0.0002 * E * Math.sin(2 * MDash - M)
                    - 0.0002 * Math.sin(omega)
                    ;

            ret.maximumTime = JDE + acc;

            var P =
                    +0.2070 * E * Math.sin(M)
                    + 0.0024 * E * Math.sin(2 * M)
                    - 0.0392 * Math.sin(MDash)
                    + 0.0116 * Math.sin(2 * MDash)
                    - 0.0073 * E * Math.sin(MDash + M)
                    + 0.0067 * E * Math.sin(MDash - M)
                    + 0.0118 * Math.sin(2 * F1)
                    ;

            var Q =
                    +5.2207
                    - 0.0048 * E * Math.cos(M)
                    + 0.0020 * E * Math.cos(2 * M)
                    - 0.3299 * Math.cos(MDash)
                    - 0.0060 * E * Math.cos(MDash + M)
                    + 0.0067 * E * Math.cos(MDash - M)
                    ;

            var W = Math.abs(Math.cos(F1));

            var gamma = (P * Math.cos(F1) + Q * Math.sin(F1)) * (1 - 0.0048 * W);

            var u =
                    +0.0059
                    + 0.0046 * E * Math.cos(M)
                    - 0.0182 * Math.cos(MDash)
                    + 0.0004 * Math.cos(2 * MDash)
                    - 0.0005 * Math.cos(M + MDash)
                    ;

            ret.gamma = gamma;
            ret.u = u;

        } else {
            certain = true;
            ret.noEclipse = true;
        }

        ret.certain = certain;

        return ret;
    }

    ON_DAED["ASTRO"].SolarEclipseType = {
        "PARTIAL": 1,
        "TOTAL": 2,
        "ANNULAR-TOTAL": 3,
        "ANNULAR": 4
    };

    ON_DAED["ASTRO"].getSolarEclipse = function (julian) {
        // MEEUS, Jean Chapter 52; Astronomical Algorithmns
        // (also) src: https://github.com/soniakeys/meeus/blob/master/eclipse/eclipse.go

        var ret = initialEclipseCalculation(julian, this.MoonPhases.NEW);

        if (!ret.noEclipse) {
            var u = ret.u;
            var gamma = ret.gamma;

            var absoluteGamma = Math.abs(gamma);

            if (absoluteGamma <= 1.5433 + u) {
                ret.penumbralConeRadius = u + 0.5461;
                ret.central = absoluteGamma < 0.9972;

                if (!ret.central) {
                    ret.eclipseType = this.SolarEclipseType.PARTIAL;
                    if (absoluteGamma < 1.026) {
                        if (absoluteGamma < 0.9972 + Math.abs(u)) { // total or annular
                            ret.eclipseType = this.SolarEclipseType.TOTAL; // report total for both cases
                        }
                    }

                    if (ret.eclipseType === this.SolarEclipseType.PARTIAL) {
                        // (52.2) p. 382
                        ret.magnitude = (1.5433 + u - absoluteGamma) / (.5461 + 2 * u);
                    }

                } else if (u < 0) {
                    ret.eclipseType = this.SolarEclipseType.TOTAL;
                } else if (u > 0.0047) {
                    ret.eclipseType = this.SolarEclipseType.ANNULAR;
                } else {

                    var omega = .00464 * Math.sqrt(1 - gamma * gamma)
                    if (u < omega) {
                        ret.eclipseType = this.SolarEclipseType['ANNULAR-TOTAL'];
                    } else {
                        ret.eclipseType = this.SolarEclipseType['ANNULAR'];
                    }
                }
            } else {
                ret.noEclipse = true;
            }
        }

        return ret;
    };

    ON_DAED["ASTRO"].getLunarEclipse = function (julian) {
        var ret = initialEclipseCalculation(julian, this.MoonPhases.FULL);
        if (!ret.noEclipse) {
            var u = ret.u;
            var gamma = ret.gamma;
            ret.ro = 1.2848 + u;
            ret.sigma = 0.7403 - u;
            ret.penumbralMagnitude = (1.5573 + u - Math.abs(gamma)) / 0.5450;
            ret.umbralMagnitude = (1.0128 - u - Math.abs(gamma)) / 0.5450;
            var n = 0.5458 + 0.400 * Math.cos(ret.MDash);
                
            if (ret.penumbralMagnitude < 0) {
                ret.penumbralEclipse = false;
            } else {
                ret.penumbralEclipse = true;
                var H = 1.5573 + u;

                ret.penumbralPhaseDuration = Math.sqrt(H * H - gamma * gamma) / (n * 24);
            }

            if (ret.umbralMagnitude < 0) {
                ret.umbralEclipse = false;
            } else {
                ret.umbralEclipse = true;
                var P = 1.0128 - u;
                var T = 0.4678 - u;

                ret.partialPhaseDuration = Math.sqrt(P * P - gamma * gamma) / (n * 24);
                ret.totalPhaseDuration = Math.sqrt(T * T - gamma * gamma) / (n * 24);
            }

            if(!ret.umbralEclipse && !ret.penumbralEclipse) {
                ret.noEclipse = true;
            }
        }

        return ret;
    };

    ON_DAED["ASTRO"].getMoonPassagesThroughTheNodes = function (julian) {
        // Chapter 49; Astronomical Algorithms; MEEUS, Jean

        var decimalYear = this.getDecimalYearFromJulian(julian);
        var rawK = (decimalYear - 2000.05) * 13.4223;

        var kAscending = parseInt(rawK);
        var kDescending = kAscending + 0.5;

        function calculatePassage(k) {
            var T = k / 1342.23;
            var D = (183.6380 + 331.73735691 * k + 0.0015057 * T * T + 0.00000209 * T * T * T - 0.000000010 * T * T * T * T) * radian;
            var M = (17.4006 + 26.82037250 * k + 0.0000999 * T * T + 0.00000006 * T * T * T) * radian;
            var MDash = (38.3776 + 355.52747322 * k + 0.0123577 * T * T + 0.000014628 * T * T * T - 0.000000069 * T * T * T * T) * radian;
            var omega = (123.9767 - 1.44098949 * k + 0.0020625 * T * T + 0.00000214 * T * T * T - 0.000000016 * T * T * T * T);
            var V = (299.75 + 132.85 * T - 0.009173 * T * T) * radian;
            var P = (omega + 272.75 - 2.3 * T) * radian;
            omega *= radian;

            // Equation 45.6; Astronomical Algorithms; MEEUS, Jean
            var E = 1 - 0.002516 * T - 0.0000074 * T * T;

            var EUpdates = E * (-0.0083 * Math.sin(2 * D - M)
                    - 0.0039 * Math.sin(2 * D - M - MDash)
                    + 0.0030 * Math.sin(2 * D + M)
                    + 0.0028 * Math.sin(M - MDash)
                    + 0.0026 * Math.sin(M)
                    + 0.0022 * Math.sin(M + MDash)
                    + 0.0005 * Math.sin(2 * D + M - MDash)
                    + 0.0004 * Math.sin(2 * D - M + MDash)
                    - 0.0003 * Math.sin(2 * D - 2 * M)
                    + 0.0003 * Math.sin(4 * D - M));

            var JDE = 2451565.1619
                    + 27.212220817 * k
                    + 0.0002572 * T * T
                    + 0.000000021 * T * T * T
                    - 0.000000000088 * T * T * T * T
                    - 0.4721 * Math.sin(MDash)
                    - 0.1649 * Math.sin(2 * D)
                    - 0.0868 * Math.sin(2 * D - MDash)
                    + 0.0084 * Math.sin(2 * D + MDash)
                    + 0.0034 * Math.sin(2 * MDash)
                    - 0.0031 * Math.sin(2 * D - 2 * MDash)
                    + 0.0025 * Math.sin(4 * D)
                    + 0.0024 * Math.sin(D)
                    + 0.0017 * Math.sin(omega)
                    + 0.0014 * Math.sin(4 * D - MDash)
                    + 0.0003 * Math.sin(V)
                    + 0.0003 * Math.sin(P)
                    + EUpdates
                    ;

            return JDE;
        }

        return {ascending: calculatePassage(kAscending), descending: calculatePassage(kDescending)};
    };

    ON_DAED["ASTRO"].getNextSolarMoonOpposition = function (julian, extMinuteInterval) {

        var minInterval = extMinuteInterval || 1;

        var stepSearch = 0.000694 * minInterval; // 1 min * x min

        var ret = null;
        var lastItEncounter = null;

        var start = julian;
        var it = start;

        var positionMoon;
        var itEncounter = Infinity;

        do {
            it += stepSearch;
            positionMoon = this.getMoonPosition(it);
            var positionSun = this.getSolarCoordinates(it);

            itEncounter = Math.acos(
                    Math.sin(positionSun.latitudeRadian) * Math.sin(positionMoon.latitudeRadian) +
                    Math.cos(positionSun.latitudeRadian) * Math.cos(positionMoon.latitudeRadian) * Math.cos(Math.abs(positionSun.longitudeRadian - positionMoon.longitudeRadian))
                    ) * 180 / Math.PI;

        } while (itEncounter > 1);

        do {
            lastItEncounter = itEncounter;

            it += stepSearch;
            positionMoon = this.getMoonPosition(it);
            var positionSun = this.getSolarCoordinates(it);

            itEncounter = Math.acos(
                    Math.sin(positionSun.latitudeRadian) * Math.sin(positionMoon.latitudeRadian) +
                    Math.cos(positionSun.latitudeRadian) * Math.cos(positionMoon.latitudeRadian) * Math.cos(Math.abs(positionSun.longitudeRadian - positionMoon.longitudeRadian))
                    ) * 180 / Math.PI;

        } while (itEncounter < lastItEncounter);

        ret = it - stepSearch;

        return {julian: ret, gregorian: this.getDateFromJulian(ret)};
    };

    ON_DAED["ASTRO"].getTransformedCoordinates = function (object) {
        var to = !isNaN(parseInt(object.to)) ? object.to : ON_DAED["ASTRO"].CoordinateType[object.to];
        var from = !isNaN(parseInt(object.from)) ? object.from : ON_DAED["ASTRO"].CoordinateType[object.from];
        var ret = null;

        if (object instanceof Object &&
                to !== undefined &&
                from !== undefined &&
                to !== from) {

            var coords;

            switch (from) {
                case ON_DAED["ASTRO"].CoordinateType.EQUATORIAL:
                    coords = object;
                    break;
                case ON_DAED["ASTRO"].CoordinateType.ECLIPTIC:
                    coords = fromEclipticToEquatorial(object.longitude, object.latitude, object.obliquity);
                    break;
                case ON_DAED["ASTRO"].CoordinateType.GALACTIC:
                    coords = fromGalacticToEquatorial(object.longitude, object.latitude);
                    break;
                case ON_DAED["ASTRO"].CoordinateType.SUPERGALACTIC:
                    coords = fromSupergalacticToEquatorial(object.longitude, object.latitude);
                    break;
                case ON_DAED["ASTRO"].CoordinateType.HORIZONTAL:
                    coords = fromHorizontalToEquatorial(object.localLatitude, object.localLongitude, object.azimute, object.altitude, object.julian);
            }

            coords.rightAscension = coords.rightAscension % (Math.PI * 2);

            if (coords.rightAscension < 0) {
                coords.rightAscension += Math.PI * 2;
            }

            switch (to) {
                case ON_DAED["ASTRO"].CoordinateType.HORIZONTAL:
                    ret = fromEquatorialToHorizontal(object.localLatitude, object.localLongitude, coords.declination, coords.rightAscension, object.julian);
                    break;
                case ON_DAED["ASTRO"].CoordinateType.EQUATORIAL:
                    ret = coords;
                    break;
                case ON_DAED["ASTRO"].CoordinateType.ECLIPTIC:
                    ret = fromEquatorialToEcliptic(coords.rightAscension, coords.declination, object.obliquity);
                    break;
                case ON_DAED["ASTRO"].CoordinateType.GALACTIC:
                    ret = fromEquatorialToGalactic(coords.rightAscension, coords.declination);
                    break;
                case ON_DAED["ASTRO"].CoordinateType.SUPERGALACTIC:
                    ret = fromEquatorialToSupergalactic(coords.rightAscension, coords.declination);
                    break;
            }

        } else {
            ret = object;
        }

        return ret;
    };

    ON_DAED["ASTRO"].getRightAscension = function (hourAngle, longitude, julian) {
        var siderealTime = this.getSiderealTimeFromJulian(julian);
        var rightAscension = siderealTime.apparentSiderealTime * 15 - longitude * degree - hourAngle * degree;

        rightAscension %= 360;

        if (rightAscension < 0) {
            rightAscension += 360;
        }

        return rightAscension;
    };

    ON_DAED["ASTRO"].getHourAngle = function (rightAscension, longitude, julian) {
        var siderealTime = this.getSiderealTimeFromJulian(julian);
        var H = siderealTime.apparentSiderealTime * 15 - longitude * degree - rightAscension * degree;

        H %= 360;

        if (H < 0) {
            H += 360;
        }

        return H;
    };

    ON_DAED["ASTRO"].getJulianFromGregorian = function (day, month, year, hour, minute, second, timezone) {

        var JD = null;

        var minJD = 0.5;
        var maxJD = 30000000;

        var compareDate = new Date();

        compareDate.setUTCHours(0, 0, 0);

        if (timezone !== undefined) {
            hour = parseFloat(hour) + parseFloat(timezone);
        }

        hour = (hour || 0);
        minute = (minute || 0);
        second = (second || 0);

        day += (second / 3600 + minute / 60 + hour) / 24;

        compareDate.setUTCDate(day);
        compareDate.setUTCMonth(month - 1);
        compareDate.setUTCFullYear(year);

        var itDate;

        if (!(day >= 1.5 && day < 2 && month === 1 && year === -4712)) {

            do {
                var mid = (minJD + maxJD) / 2;
                itDate = this.getDateFromJulian(mid);

                if (itDate.getUTCDate() === compareDate.getUTCDate() &&
                        itDate.getUTCMonth() === compareDate.getUTCMonth() &&
                        itDate.getUTCFullYear() === compareDate.getUTCFullYear()) {
                    JD = mid;
                } else if (itDate > compareDate) {
                    maxJD = mid;
                } else {
                    minJD = mid;
                }

            } while (minJD < maxJD && JD === null);

        } else {
            JD = 0;
        }

        if ((JD % 1) > 0.5) {
            JD += 1;
        }

        JD = parseInt(JD) + (day % 1) - 0.5;

        return Math.round(JD * 10000000) / 10000000;
    };

    ON_DAED["ASTRO"].getSiderealTimeFromJulian = function (julian) {
        // Chapter 11; Astronomical Algorithms; MEEUS, Jean
        var T = this.getJulianCentury(julian);

        var initTheta = 280.46061837 + 360.98564736629 * (julian - this.epochDate)
                + 0.000387933 * T * T - (T * T * T) / 38710000;

        var obliquity = this.getEclipticObliquity(julian);
        var theta = initTheta;

        var nutationError = ((obliquity.nutation.longitude) * Math.cos(obliquity.obliquityRadian));
        theta += nutationError;

        theta %= 360;

        if (theta < 0) {
            theta += 360;
        }

        theta /= 15;

        initTheta %= 360;

        if (initTheta < 0) {
            initTheta += 360;
        }

        initTheta /= 15;

        return {
            obliquity: obliquity,
            julian: julian,
            meanSiderealTime: initTheta,
            apparentSiderealTime: theta
        };
    };

    function dayOfYear(dt) {
        var j1 = new Date(dt);
        j1.setMonth(0, 0);
        return Math.round((dt - j1) / 8.64e7);
    }

    function leapYear(year)
    {
        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    }

    ON_DAED["ASTRO"].MoonPhases = {
        NEW: 0,
        WAXING_CRESCENT: 0.125,
        FIRST_QUARTER: 0.25,
        WAXING_GIBBOUS: 0.375,
        FULL: 0.5,
        WANING_GIBBOUS: 0.625,
        LAST_QUARTER: 0.75,
        WANING_CRESCENT: 0.875
    };

    ON_DAED["ASTRO"].getIlluminatedFractionOfMoonDiskFromJulian = function (julian) {
        var solar = ON_DAED.ASTRO.getSolarCoordinates(julian);
        var lunar = ON_DAED.ASTRO.getMoonPosition(julian);
        return ON_DAED.ASTRO.getIlluminatedFractionOfMoonDisk(
                lunar.longitudeRadian,
                lunar.latitudeRadian,
                solar.longitudeRadian,
                lunar.distanceFromEarth,
                solar.distanceFromEarth * UA);
    };

    ON_DAED["ASTRO"].getIlluminatedFractionOfMoonDisk = function (eclipticLongitudeMoon, eclipticLatitudeMoon, eclipticLongitudeSun, distanceEarthMoon, distanceEarhSun) {
        // Chapter 46; ASTRONOMICAL ALGORITHMS; MEEUS, Jean; Pg. 317
        var elongation = Math.acos(Math.cos(eclipticLatitudeMoon) * Math.cos(eclipticLongitudeMoon - eclipticLongitudeSun));
        var i = Math.atan2((distanceEarhSun * Math.sin(elongation)), (distanceEarthMoon - distanceEarhSun * Math.cos(elongation)));
        //var i = Math.acos(-Math.cos(elongation));
        var k = (1 + Math.cos(i)) / 2;
        return Math.round(k * 10000) / 10000;
    };

    ON_DAED["ASTRO"].getDecimalYearFromJulian = function (julian) {
        var unix = parseInt(ON_DAED["ASTRO"].getUnixFromJulian(julian));
        var dt = new Date(unix);
        var day = dayOfYear(dt);
        var year = dt.getUTCFullYear();
        var addLeapYear = leapYear(year) ? 1 : 0;
        return dt.getUTCFullYear() + (day / (365 + addLeapYear));
    };

    ON_DAED["ASTRO"].getDayOfYearFromJulian = function (julian) {
        var unix = parseInt(ON_DAED["ASTRO"].getUnixFromJulian(julian));
        var dt = new Date(unix);
        var day = dayOfYear(dt);
        return day;
    };

    ON_DAED["ASTRO"].getNextMoonPhaseAngles = function (julian, phase) {
        // Chapter 47; ASTRONOMICAL ALGORITHMS; MEEUS, Jean; Pg. 319
        var unix = parseInt(ON_DAED["ASTRO"].getUnixFromJulian(julian));
        var dt = new Date(unix);
        var day = dayOfYear(dt);

        var k = Math.round((dt.getUTCFullYear() + day / 365.25 - 2000) * 12.3685);

        k += phase || 0;

        var T = k / 1236.85;

        var JDE = 2451550.09765
                + 29.530588853 * k
                + 0.0001337 * T * T
                - 0.000000150 * T * T * T
                + 0.00000000073 * T * T * T * T;

        // formula 45.6
        var E = 1 - 0.002516 * T - 0.0000074 * T * T;

        // sun mean anomaly
        var M = 2.5534
                + 29.10535669 * k
                - 0.0000218 * T * T
                - 0.00000011 * T * T * T;

        M %= 360;
        if (M < 0)
            M += 360;

        // moon mean anomaly
        var MDash = 201.5643
                + 385.81693528 * k
                + 0.0107438 * T * T
                + 0.00001239 * T * T * T
                + 0.000000058 * T * T * T * T;

        MDash %= 360;
        if (MDash < 0)
            MDash += 360;

        // moon argument of latitude
        var F = 160.7108
                + 390.67050274 * k
                - 0.0016341 * T * T
                - 0.00000227 * T * T * T
                + 0.000000011 * T * T * T * T;

        F %= 360;
        if (F < 0)
            F += 360;

        // longitude of ascending node of lunar orbit
        var omega = 124.7746
                - 1.56375580 * k
                + 0.0020691 * T * T
                + 0.00000215 * T * T * T;

        omega %= 360;
        if (omega < 0)
            omega += 360;

        return {
            omega: omega,
            F: F,
            MDash: MDash,
            M: M,
            E: E,
            JDE: JDE,
            T: T,
            k: k
        };
    };

    ON_DAED["ASTRO"].getNextMoonPhaseFromJulian = function (julian, phase) {
        // Chapter 47; ASTRONOMICAL ALGORITHMS; MEEUS, Jean; Pg. 319
        var angles = ON_DAED["ASTRO"].getNextMoonPhaseAngles(julian, phase);

        var k = angles.k;
        var T = angles.T;
        var MDash = angles.MDash;
        var M = angles.M;
        var F = angles.F;
        var omega = angles.omega;
        var E = angles.E;
        var JDE = angles.JDE;

        // planetary arguments
        var planetaryArguments = [
            299.77 + 0.107408 * k - 0.009173 * T * T // A1
                    , 251.88 + 0.016321 * k // A2
                    , 251.83 + 26.651886 * k // A3
                    , 349.42 + 36.412478 * k // A4
                    , 84.66 + 18.206239 * k // A5
                    , 141.74 + 53.303771 * k // A6
                    , 207.14 + 2.453732 * k // A7
                    , 154.84 + 7.306860 * k // A8
                    , 34.52 + 27.261239 * k // A9
                    , 207.19 + 0.121824 * k // A10
                    , 291.34 + 1.844379 * k // A11
                    , 161.72 + 24.198154 * k // A12
                    , 239.56 + 25.513099 * k // A13
                    , 331.55 + 3.592518 * k // A14
        ];

        var planetaryParameters = [
            0.000325,
            0.000165,
            0.000164,
            0.000126,
            0.000110,
            0.000062,
            0.000060,
            0.000056,
            0.000047,
            0.000042,
            0.000040,
            0.000037,
            0.000035,
            0.000023
        ];

        var argumentVariablesFullAndNew =
                [
                    MDash,
                    M,
                    2 * MDash,
                    2 * F,
                    MDash - M,
                    MDash + M,
                    2 * M,
                    MDash - 2 * F,
                    MDash + 2 * F,
                    2 * MDash + M,
                    3 * MDash,
                    M + 2 * F,
                    M - 2 * F,
                    2 * MDash - M,
                    omega,
                    MDash + 2 * M,
                    2 * MDash - 2 * F,
                    3 * M,
                    MDash + M - 2 * F,
                    2 * MDash + 2 * F,
                    MDash + M + 2 * F,
                    MDash - M + 2 * F,
                    MDash - M - 2 * F,
                    3 * MDash + M,
                    4 * MDash
                ];

        var newMoonParameters = [
            -0.40720,
            0.17241 * E,
            0.01608,
            0.01039,
            0.00739 * E,
            -0.00514 * E,
            0.00208 * E * E,
            -0.00111,
            -0.00057,
            0.00056 * E,
            -0.00042,
            0.00042 * E,
            0.00038 * E,
            -0.00024 * E,
            -0.00017,
            -0.00007,
            0.00004,
            0.00004,
            0.00003,
            0.00003,
            -0.00003,
            0.00003,
            -0.00002,
            -0.00002,
            0.00002
        ];

        var fullMoonParameters = [
            -0.40614,
            0.17302 * E,
            0.01614,
            0.01043,
            0.00734 * E,
            -0.00515 * E,
            0.00209 * E * E,
            -0.00111,
            -0.00057,
            0.00056 * E,
            -0.00042,
            0.00042 * E,
            0.00038 * E,
            -0.00024 * E,
            -0.00017,
            -0.00007,
            0.00004,
            0.00004,
            0.00003,
            0.00003,
            -0.00003,
            0.00003,
            -0.00002,
            -0.00002,
            0.00002
        ];

        var firstLastQuarterParameter = [
            -0.62801,
            0.17172 * E,
            -0.01183 * E,
            0.00862,
            0.00804,
            0.00454 * E,
            0.00204 * E * E,
            -0.00180,
            -0.00070,
            -0.00040,
            -0.00034 * E,
            0.00032 * E,
            0.00032 * E,
            -0.00028 * E * E,
            0.00027 * E,
            -0.00017,
            -0.00005,
            0.00004,
            -0.00004,
            0.00004,
            0.00003,
            0.00003,
            0.00002,
            0.00002,
            -0.00002
        ];

        var argumentFirstLastQuarter = [
            MDash,
            M,
            MDash + M,
            2 * MDash,
            2 * F,
            MDash - M,
            2 * M,
            MDash - 2 * F,
            MDash + 2 * F,
            3 * MDash,
            2 * MDash - M,
            M + 2 * F,
            M - 2 * F,
            MDash + 2 * M,
            2 * MDash + M,
            omega,
            MDash - M - 2 * F,
            2 * MDash + 2 * F,
            MDash + M + 2 * F,
            MDash - 2 * M,
            MDash + M - 2 * F,
            3 * M,
            2 * MDash - 2 * F,
            MDash - M + 2 * F,
            3 * MDash + M
        ];

        function calculateArgsAndParams(arguments, parameters) {
            var acc = 0;
            for (var i = 0; i < arguments.length; i++) {
                acc += Math.sin(arguments[i] * radian) * parameters [i];
            }
            return acc;
        }

        var additionalDataAll = calculateArgsAndParams(planetaryArguments, planetaryParameters);
        var JDFinal = null;

        if (phase === this.MoonPhases.FULL) {
            var additionalDataFull = calculateArgsAndParams(argumentVariablesFullAndNew, fullMoonParameters);
            JDFinal = JDE + additionalDataFull + additionalDataAll;
        } else if (phase === this.MoonPhases.NEW) {
            var additionalDataNew = calculateArgsAndParams(argumentVariablesFullAndNew, newMoonParameters);
            JDFinal = JDE + additionalDataNew + additionalDataAll;
        } else {
            var additionalDataFirstLast = calculateArgsAndParams(argumentFirstLastQuarter, firstLastQuarterParameter);
            JDFinal = JDE + additionalDataFirstLast + additionalDataAll;
            var W = 0.00306 - 0.00038 * E * Math.cos(M * radian) + 0.00026 * Math.cos(MDash * radian)
                    - 0.00002 * Math.cos((MDash - M) * radian) + 0.00002 * Math.cos((MDash + M) * radian) + 0.00002 * Math.cos(2 * F * radian);

            JDFinal += phase - 0.5 < 0 ? W : -W;
        }

        return JDFinal;
    };

    ON_DAED["ASTRO"].getSiderealTimeFromGregorian = function (day, month, year, hour, minute, second, timezone) {
        var julian = this.getJulianFromGregorian(day, month, year, hour, minute, second, timezone);
        var siderealTime = this.getSiderealTimeFromJulian(julian);
        return siderealTime;
    };

    ON_DAED["ASTRO"].getJulianFromUnix = function (unixMilliSecs) {
        // 2440587.5 = UNIX EPOCH

        return (unixMilliSecs / 86400000.0) + 2440587.5;
    };

    ON_DAED["ASTRO"].getUnixFromJulian = function (julian) {
        var date = this.getDateFromJulian(julian);
        return date.getTime();
    };

    ON_DAED["ASTRO"].getDateFromJulian = function (julian) {
        // Chapter 7; Astronomical Algorithms; MEEUS, Jean

        // DOES NOT WORK FOR julian < 0
        julian += 0.5;
        var Z = parseInt(julian);
        var F = julian % 1;
        var A;

        if (Z < 2299161) {
            A = Z;
        } else {
            var alpha = parseInt((Z - 1867216.25) / 36524.25);
            A = Z + 1 + alpha - parseInt(alpha / 4);
        }

        var B = A + 1524;
        var C = parseInt((B - 122.1) / 365.25);
        var D = parseInt(365.25 * C);
        var E = parseInt((B - D) / 30.6001);

        var ret = {};

        ret.day = B - D - parseInt(30.6001 * E) + F;

        if (E < 14) {
            ret.month = E - 1;
        } else {
            ret.month = E - 13;
        }

        if (ret.month > 2) {
            ret.year = C - 4716;
        } else {
            ret.year = C - 4715;
        }

        var hourBuffer = (ret.day % 1) * 24;
        var minuteBuffer = (hourBuffer % 1) * 60;

        ret.hour = parseInt(hourBuffer);
        ret.minute = parseInt(minuteBuffer);
        ret.second = Math.round((minuteBuffer % 1) * 60 * 100) / 100;

        ret.day = parseInt(ret.day);

        var d1 = new Date(0);

        d1.setUTCDate(ret.day);
        d1.setUTCMonth(ret.month - 1);
        d1.setUTCFullYear(ret.year);
        d1.setUTCHours(ret.hour);
        d1.setUTCMinutes(ret.minute);
        d1.setUTCSeconds(ret.second);

        return d1;
    };

    function threeTermsInterpolation(y1, y2, y3, n) {
        var a = y2 - y1;
        var b = y3 - y2;
        var c = b - a;
        return y2 + (n / 2) * (a + b + n * c);
    }

    ON_DAED["ASTRO"].getTransit = function (localLongitude, localLatitude, julian, type) {
        // Chapter 14; ASTRONOMICAL ALGORITHMS; MEEUS, Jean; Pg. 98
        var ret = null;

        if (type !== ON_DAED["ASTRO"].SolarSystemBody.EARTH) {
            ret = {};

            var initH = 0;

            var position1;
            var position2;
            var position3;

            var d2 = (julian % 1 >= 0.5 ? parseInt(julian) : parseInt(julian - 1)) + 0.5;
            var d1 = d2 - 1;
            var d3 = d2 + 1;

            var obliquity1 = this.getEclipticObliquity(d1);
            var obliquity2 = this.getEclipticObliquity(d2);
            var obliquity3 = this.getEclipticObliquity(d3);

            if (type === ON_DAED["ASTRO"].SolarSystemBody.SUN) {
                initH = -0.8333333333333334;
                position1 = this.getSolarCoordinates(d1);
                position2 = this.getSolarCoordinates(d2);
                position3 = this.getSolarCoordinates(d3);
            } else if (type === ON_DAED["ASTRO"].SolarSystemBody.MOON) {
                var parallax = ON_DAED["ASTRO"].getMoonPosition(d2).horizontalParallax;
                initH = 0.7275 * parallax - 0.5666666666666667;
                position1 = this.getLunarCoordinates(d1);
                position2 = this.getLunarCoordinates(d2);
                position3 = this.getLunarCoordinates(d3);
            } else {
                initH = -0.5666666666666667;
                position1 = this.getSolarSystemBodyPosition(type, d1, obliquity1.nutation.longitudeRadian);
                position2 = this.getSolarSystemBodyPosition(type, d2, obliquity2.nutation.longitudeRadian);
                position3 = this.getSolarSystemBodyPosition(type, d3, obliquity3.nutation.longitudeRadian);
            }

            var conversionOptions = {
                to: this.CoordinateType.EQUATORIAL,
                from: this.CoordinateType.ECLIPTIC
            };

            function toEquatorial(p, obliquity) {
                var retPos;
                conversionOptions.latitude = p.latitudeRadian;
                conversionOptions.longitude = p.longitudeRadian;
                conversionOptions.obliquity = obliquity.obliquityRadian;

                retPos = ON_DAED["ASTRO"].getTransformedCoordinates(conversionOptions);
                retPos.rightAscension *= degree;
                retPos.declination *= degree;

                if (retPos.rightAscension < 0) {
                    retPos.rightAscension += 360;
                }

                return retPos;
            }

            position1 = toEquatorial(position1, obliquity1);
            position2 = toEquatorial(position2, obliquity2);
            position3 = toEquatorial(position3, obliquity3);

            var deltaT = this.getDynamicalTimeDifference(d2);
            var initTheta = this.getSiderealTimeFromJulian(d2).apparentSiderealTime * 15;

            var hourAngleArg = (Math.sin(initH * radian) - Math.sin(localLatitude) * Math.sin(position2.declination * radian)) /
                    (Math.cos(localLatitude) * Math.cos(position2.declination * radian));

            var transit = null;
            var setting = null;
            var rising = null;

            if (hourAngleArg >= -1 && hourAngleArg <= 1) {

                var hourAngle = Math.acos(hourAngleArg) * degree;

                var initM = (position2.rightAscension + localLongitude * degree - initTheta) / 360;

                initM %= 1;

                if (initM < 0) {
                    initM += 1;
                }

                var m1 = initM - hourAngle / 360;

                m1 %= 1;

                if (m1 < 0) {
                    m1 += 1;
                }

                var m2 = initM + hourAngle / 360;

                m2 %= 1;

                if (m2 < 0) {
                    m2 += 1;
                }

                function calculateInstant(m, transit) {
                    var theta = initTheta + 360.985647 * m;
                    var n = m + deltaT / 86400;
                    var alpha = threeTermsInterpolation(position1.rightAscension, position2.rightAscension, position3.rightAscension, n);
                    var delta = threeTermsInterpolation(position1.declination, position2.declination, position3.declination, n);
                    var deltaM;
                    var H = theta - localLongitude * degree - alpha;
                    if (transit) {
                        deltaM = -H / 360;
                    } else {
                        var h = Math.asin(Math.sin(localLatitude) * Math.asin(delta * radian) + Math.cos(localLatitude) * Math.cos(delta * radian) * Math.cos(H * radian));
                        deltaM = (h - initH) / (360 * Math.cos(delta * radian) * Math.cos(localLatitude) * Math.sin(H * radian));
                    }

                    return m + deltaM;
                }

                rising = calculateInstant(m1, false);
                transit = calculateInstant(initM, true);
                setting = calculateInstant(m2, false);

                rising %= 1;

                if (rising < 0) {
                    rising += 1;
                }

                transit %= 1;

                if (transit < 0) {
                    transit += 1;
                }

                setting %= 1;

                if (setting < 0) {
                    setting += 1;
                }

            }

            ret.rising = rising;
            ret.transit = transit;
            ret.setting = setting;

        }

        return ret;
    };

    ON_DAED["ASTRO"].epochDate = 2451545.0; // J2000

    ON_DAED["ASTRO"].getJulianCentury = function (julian) {
        // Chapter 7; Astronomical Algorithms; MEEUS, Jean; Pg. 131
        return (julian - this.epochDate) / 36525;
    };

    ON_DAED["ASTRO"].getDynamicalTimeDifference = function (julian) {
        return Math.ceil(((-15 + Math.pow((julian - 2382148), 2) / 41048480) / 100) * 60);
    };

    ON_DAED["ASTRO"].getEarthNutation = function (julian) {
        // Chapter 21; Astronomical Algorithms; MEEUS, Jean; Pg. 132
        var T = this.getJulianCentury(julian);

        // Mean elongation of the Moon from the Sun:
        var D = 297.85036 + 445267.111480 * T - 0.0019142 * T * T + (T * T * T) / 189474;

        // Mean anomaly of the Sun (Earth)
        var M = 357.52772 + 35999.050340 * T - 0.0001603 * T * T - (T * T * T) / 300000;

        // Mean anomaly of the Moon:
        var MDash = 134.96298 + 477198.867398 * T + 0.0086972 * T * T + (T * T * T) / 56250;

        // Moon's argument of latitude:
        var F = 93.27191 + 483202.017538 * T - 0.0036825 * T * T + (T * T * T) / 327270;

        // Longitude of the ascending node of the Moon's mean orbit on the
        // ecliptic, measured from the mean equinox of the date:
        var omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;

        // Calculation the sums in Table 21.A; Unit: 0".0001
        var deltaPsi = 0; // Nutation in longitude
        var deltaEpisilon = 0; // Nutation in obliquity

        // calculating table

        function calculateArgument(n1, n2, n3, n4, n5) {
            return (n1 * D + n2 * M + n3 * MDash + n4 * F + n5 * omega) * radian;
        }

        var arg;

        function addArgument(n1, n2, n3, n4, n5, c1, c2) {
            arg = calculateArgument(n1, n2, n3, n4, n5);
            deltaPsi += c1 * Math.sin(arg);
            deltaEpisilon += c2 * Math.cos(arg);
        }

        // line 1
        addArgument(0, 0, 0, 0, 1,
                (-171996 - 174.2 * T),
                (92025 + 8.9 * T));

        // line 2
        addArgument(-2, 0, 0, 2, 2,
                (-13187 - 1.6 * T),
                (5736 - 3.1 * T));

        // line 3
        addArgument(0, 0, 0, 2, 2,
                (-2274 - 0.2 * T),
                (977 - 0.5 * T));

        // line 4
        addArgument(0, 0, 0, 0, 2,
                (2062 + 0.2 * T),
                (-895 + 0.5 * T));

        // line 5
        addArgument(0, 1, 0, 0, 0,
                (1426 - 3.4 * T),
                (54 - 0.1 * T));

        // line 6
        addArgument(0, 0, 1, 0, 0,
                (712 + 0.1 * T),
                (-7));

        // line 7
        addArgument(-2, 1, 0, 2, 2,
                (-517 + 1.2 * T),
                (224 - 0.6 * T));

        // line 8
        addArgument(0, 0, 0, 2, 1,
                (-386 - 0.4 * T),
                (200));

        // line 9
        addArgument(0, 0, 1, 2, 2,
                (-301),
                (129 - 0.1 * T));

        // line 10
        addArgument(-2, -1, 0, 2, 2,
                (217 - 0.5 * T),
                -95 + 0.3 * T);

        // line 11
        addArgument(-2, 0, 1, 0, 0,
                (-158),
                (0));

        // line 12
        addArgument(-2, 0, 0, 2, 1,
                (129 + 0.1 * T),
                (-70));

        // line 13
        addArgument(0, 0, -1, 2, 2,
                123,
                -53);

        // line 14
        addArgument(2, 0, 0, 0, 0,
                63,
                0);

        // line 15
        addArgument(0, 0, 1, 0, 1,
                63 + 0.1 * T,
                -33);

        // line 16
        addArgument(2, 0, -1, 2, 2,
                -59,
                26);

        // line 17
        addArgument(0, 0, -1, 0, 1,
                -58 - 0.1 * T,
                32);

        // line 18
        addArgument(0, 0, 1, 2, 1,
                -51,
                27);

        // line 19
        addArgument(-2, 0, 2, 0, 0,
                48,
                0);

        // line 20
        addArgument(0, 0, -2, 2, 1,
                46,
                -24);

        // line 21
        addArgument(2, 0, 0, 2, 2,
                -38,
                16);

        // line 22
        addArgument(0, 0, 2, 2, 2,
                -31,
                13);

        // line 23
        addArgument(0, 0, 2, 0, 0,
                29,
                0);

        // line 24
        addArgument(-2, 0, 1, 2, 2,
                29,
                -12);

        // line 25
        addArgument(0, 0, 0, 2, 0,
                26,
                0);

        // line 26
        addArgument(-2, 0, 0, 2, 0,
                -22,
                0);

        // line 27
        addArgument(0, 0, -1, 2, 1,
                21,
                -10);

        // line 28
        addArgument(0, 2, 0, 0, 0,
                17 - 0.1 * T,
                0);

        // line 29
        addArgument(2, 0, -1, 0, 1,
                16,
                -8);

        // line 30
        addArgument(-2, 2, 0, 2, 2,
                -16 + 0.1 * T,
                7);

        // line 31
        addArgument(0, 1, 0, 0, 1,
                -15,
                9);

        // Pg. 134

        // line 32
        addArgument(-2, 0, 1, 0, 1,
                -13,
                7);

        // line 33
        addArgument(0, -1, 0, 0, 1,
                -12,
                6);

        // line 34
        addArgument(0, 0, 2, -2, 0,
                11,
                0);

        // line 35
        addArgument(2, 0, -1, 2, 1,
                -10,
                5);

        // line 36
        addArgument(2, 0, 1, 2, 2,
                -8,
                3);

        // line 37
        addArgument(0, 1, 0, 2, 2,
                7,
                -3);

        // line 38
        addArgument(-2, 1, 1, 0, 0,
                -7,
                0);

        // line 39
        addArgument(0, -1, 0, 2, 2,
                -7,
                3);

        // line 40
        addArgument(2, 0, 0, 2, 1,
                -7,
                3);

        // line 41
        addArgument(2, 0, 1, 0, 0,
                6,
                0);

        // line 42
        addArgument(-2, 0, 2, 2, 2,
                6,
                -3);

        // line 43
        addArgument(-2, 0, 1, 2, 1,
                6,
                -3);

        // line 44
        addArgument(2, 0, -2, 0, 1,
                -6,
                3);

        // line 45
        addArgument(2, 0, 0, 0, 1,
                -6,
                3);

        // line 46
        addArgument(0, -1, 1, 0, 0,
                5,
                0);

        // line 47
        addArgument(-2, -1, 0, 2, 1,
                -5,
                +3);

        // line 47
        addArgument(-2, 0, 0, 0, 1,
                -5,
                +3);

        // line 48
        addArgument(0, 0, 2, 2, 1,
                -5,
                +3);

        // line 49
        addArgument(-2, 0, 2, 0, 1,
                4,
                0);

        // line 50
        addArgument(-2, 1, 0, 2, 1,
                4,
                0);

        // line 51
        addArgument(0, 0, 1, -2, 0,
                4,
                0);

        // line 52
        addArgument(-1, 0, 1, 0, 0,
                -4,
                0);

        // line 53
        addArgument(-2, 1, 0, 0, 0,
                -4,
                0);

        // line 54
        addArgument(1, 0, 0, 0, 0,
                -4,
                0);

        // line 55
        addArgument(0, 0, 1, 2, 0,
                3,
                0);

        // line 56
        addArgument(0, 0, -2, 2, 2,
                -3,
                0);

        // line 57
        addArgument(-1, -1, 1, 0, 0,
                -3,
                0);

        // line 58
        addArgument(0, 1, 1, 0, 0,
                -3,
                0);

        // line 59
        addArgument(0, -1, 1, 2, 2,
                -3,
                0);

        // line 60
        addArgument(2, -1, -1, 2, 2,
                -3,
                0);

        // line 61
        addArgument(0, 0, 3, 2, 2,
                -3,
                0);

        // line 62
        addArgument(2, -1, 0, 2, 2,
                -3,
                0);

        // converting from 0".0001 to degrees
        deltaPsi /= (10000 * 60 * 60);
        deltaEpisilon /= (10000 * 60 * 60);

        return {
            longitude: deltaPsi,
            obliquity: deltaEpisilon,
            longitudeRadian: deltaPsi * radian,
            obliquityRadian: deltaEpisilon * radian
        };
    };

    ON_DAED["ASTRO"].getSingleDegreeValue = function (degree, minute, second) {
        return degree + minute / 60 + second / 3600;
    };

    ON_DAED["ASTRO"].getEclipticObliquity = function (julian) {
        // Chapter 21; Astronomical Algorithms; MEEUS, Jean; Pg. 135
        var U = this.getJulianCentury(julian) / 100;
        var nutation = this.getEarthNutation(julian);

        var initialEpisilon =
                this.getSingleDegreeValue(23, 26, 21.448)
                - this.getSingleDegreeValue(0, 0, 4680.93) * Math.pow(U, 1)
                - this.getSingleDegreeValue(0, 0, 1.55) * Math.pow(U, 2)
                + this.getSingleDegreeValue(0, 0, 1999.25) * Math.pow(U, 3)
                - this.getSingleDegreeValue(0, 0, 51.38) * Math.pow(U, 4)
                - this.getSingleDegreeValue(0, 0, 249.67) * Math.pow(U, 5)
                - this.getSingleDegreeValue(0, 0, 39.05) * Math.pow(U, 6)
                + this.getSingleDegreeValue(0, 0, 7.12) * Math.pow(U, 7)
                + this.getSingleDegreeValue(0, 0, 27.87) * Math.pow(U, 8)
                + this.getSingleDegreeValue(0, 0, 5.79) * Math.pow(U, 9)
                + this.getSingleDegreeValue(0, 0, 2.45) * Math.pow(U, 10);

        var finalEpisilon = initialEpisilon + nutation.obliquity;

        return {
            obliquityRadian: finalEpisilon * radian,
            obliquity: finalEpisilon,
            nutation: nutation
        };
    };

    ON_DAED["ASTRO"].getMoonPosition = function (julian) {
        // Chapter 45; Astronomical Algorithms; MEEUS, Jean; Pg. 307
        var T = this.getJulianCentury(julian);

        // Chapter 45; Astronomical Algorithms; MEEUS, Jean; Pg. 308
        // Moon's mean longitude, referred to the mean equinox of the date and including the constant term of the effect of light-time
        var LDash = 218.3164591 + 481267.88134236 * T - 0.0013268 * T * T + (T * T * T) / 538841 - (T * T * T * T) / 65194000;

        // Mean elongation of the Moon:
        var D = 297.8502042 + 445267.1115168 * T
                - 0.0016300 * T * T + (T * T * T) / 545868 - (T * T * T * T) / 113065000;

        // Sun's mean anomaly
        var M = 357.5291092 + 35999.0502909 * T
                - 0.0001536 * T * T + (T * T * T) / 24490000;

        // Moon's mean anomaly
        var MDash = 134.9634114 + 477198.8676313 * T
                + 0.0089970 * T * T + (T * T * T) / 69699 - (T * T * T * T) / 14712000;

        // Moon's argument of latitude (mean distance of the Moon from its ascending node)
        var F = 93.2720993 + 483202.0175273 * T
                - 0.0034029 * T * T - (T * T * T) / 3526000 + (T * T * T * T) / 863310000;

        // Further Arguments
        var A1 = 119.75 + 131.849 * T; // Venus
        var A2 = 53.09 + 479267.290 * T; // Jupiter
        var A3 = 313.45 + 481266.484 * T; // Flattening of the Earth

        // Corrrection based on Ecliptic
        var E = 1 - 0.002516 * T - 0.0000074 * T * T;

        // Chapter 45; Astronomical Algorithms; MEEUS, Jean; Pg. 309
        // Calculating sigmaL and sigmaR for Table 45.A

        var sigmaL = 0;
        var sigmaR = 0;
        var sigmaB = 0;
        var arg;

        function calculateArgument(n1, n2, n3, n4) {
            // (...) the amplitude of these terms is actually variable. To take this effect into account, 
            // multiply the terms whose argument contains M (or -M) by E, and those containing 2M (or -2M) by E^2 (...)
            return (n1 * D + n2 * M + n3 * MDash + n4 * F) * radian *
                    (n2 === 1 || n2 === -1 ? E : n2 === 2 || n2 === -2 ? E * E : 1);
        }

        var arg;

        function addInitialArgument(n1, n2, n3, n4, c1, c2) {
            arg = calculateArgument(n1, n2, n3, n4);
            sigmaL += c1 * Math.sin(arg); // unit 0.000001 degree
            sigmaR += c2 * Math.cos(arg); // unit 0.001 km
        }

        // Line 1
        addInitialArgument(0, 0, 1, 0,
                6288774,
                -20905355);

        // Line 2
        addInitialArgument(2, 0, -1, 0,
                1274027,
                -3699111);

        // Line 3
        addInitialArgument(2, 0, 0, 0,
                658314,
                -2955968);

        // Line 4
        addInitialArgument(0, 0, 2, 0,
                213618,
                -569925);

        // Line 5
        addInitialArgument(0, 1, 0, 0,
                -185116,
                48888);

        // Line 6
        addInitialArgument(0, 0, 0, 2,
                -114332,
                -3149);

        // Line 7
        addInitialArgument(2, 0, -2, 0,
                58793,
                246158);

        // Line 8
        addInitialArgument(2, -1, -1, 0,
                57066,
                -152138);

        // Line 9
        addInitialArgument(2, 0, 1, 0,
                53322,
                -170733);

        // Line 10
        addInitialArgument(2, -1, 0, 0,
                45758,
                -204586);

        // Line 11
        addInitialArgument(0, 1, -1, 0,
                -40923,
                -129620);

        // Line 12
        addInitialArgument(1, 0, 0, 0,
                -34720,
                108743);

        // Line 13
        addInitialArgument(0, 1, 1, 0,
                -30383,
                104755);

        // Line 14
        addInitialArgument(2, 0, 0, -2,
                15327,
                10321);

        // Line 15
        addInitialArgument(0, 0, 1, 2,
                -12528,
                0);

        // Line 16
        addInitialArgument(4, 0, -1, 0,
                10675,
                -34782);

        // Line 17
        addInitialArgument(0, 0, 3, 0,
                10034,
                -23210);

        // Line 18
        addInitialArgument(4, 0, -2, 0,
                8548,
                -21636);

        // Line 19
        addInitialArgument(2, 1, -1, 0,
                -7888,
                24208);

        // Line 20
        addInitialArgument(2, 1, 0, 0,
                -6766,
                30824);

        // Line 21
        addInitialArgument(1, 0, -1, 0,
                -5163,
                -8379);

        // Line 22
        addInitialArgument(1, 1, 0, 0,
                4987,
                -16675);

        // Line 23
        addInitialArgument(2, -1, 1, 0,
                4036,
                -12831);

        // Line 24
        addInitialArgument(2, 0, 2, 0,
                3994,
                -10445);

        // Line 25
        addInitialArgument(4, 0, 0, 0,
                3861,
                -11650);

        // Line 26
        addInitialArgument(2, 0, -3, 0,
                3665,
                14403);

        // Line 27
        addInitialArgument(0, 1, -2, 0,
                -2689,
                -7003);

        // Line 28
        addInitialArgument(2, 0, -1, 2,
                -2602,
                0);

        // Line 29
        addInitialArgument(2, -1, -2, 0,
                2390,
                10056);

        // Line 30
        addInitialArgument(1, 0, 1, 0,
                -2348,
                6322);

        // Line 31
        addInitialArgument(2, -2, 1, 0,
                2236,
                -9884);

        // Chapter 45; Astronomical Algorithms; MEEUS, Jean; Pg. 310
        // Calculating sigmaL and sigmaR for Table 45.A (cont.)

        // Line 32
        addInitialArgument(0, 1, 2, 0,
                -2120,
                5751);

        // Line 33
        addInitialArgument(0, 2, 0, 0,
                -2069,
                0);

        // Line 34
        addInitialArgument(2, -2, -1, 0,
                2048,
                -4950);

        // Line 35
        addInitialArgument(2, 0, 1, -2,
                -1773,
                4130);

        // Line 36
        addInitialArgument(2, 0, 0, 2,
                -1595,
                0);

        // Line 37
        addInitialArgument(4, -1, -1, 0,
                1215,
                -3958);

        // Line 38
        addInitialArgument(0, 0, 2, 2,
                -1110,
                0);


        // Line 39
        addInitialArgument(3, 0, -1, 0,
                -892,
                3258);

        // Line 40
        addInitialArgument(2, 1, 1, 0,
                -810,
                2616);

        // Line 41
        addInitialArgument(4, -1, -2, 0,
                759,
                -1897);

        // Line 42
        addInitialArgument(0, 2, -1, 0,
                -713,
                -2117);

        // Line 43
        addInitialArgument(2, 2, -1, 0,
                -700,
                2354);

        // Line 44
        addInitialArgument(2, 1, -2, 0,
                691,
                0);

        // Line 45
        addInitialArgument(2, -1, 0, -2,
                596,
                0);

        // Line 46
        addInitialArgument(4, 0, 1, 0,
                549,
                -1423);

        // Line 47
        addInitialArgument(0, 0, 4, 0,
                537,
                -1117);

        // Line 48
        addInitialArgument(4, -1, 0, 0,
                520,
                -1571);

        // Line 49
        addInitialArgument(1, 0, -2, 0,
                -487,
                -1739);

        // Line 50
        addInitialArgument(2, 1, 0, -2,
                -399,
                0);

        // Line 51
        addInitialArgument(0, 0, 2, -2,
                -381,
                -4421);

        // Line 52
        addInitialArgument(1, 1, 1, 0,
                351,
                0);

        // Line 53
        addInitialArgument(3, 0, -2, 0,
                -340,
                0);

        // Line 54
        addInitialArgument(4, 0, -3, 0,
                330,
                0);

        // Line 55
        addInitialArgument(2, -1, 2, 0,
                327,
                0);

        // Line 56
        addInitialArgument(0, 2, 1, 0,
                -323,
                1165);

        // Line 57
        addInitialArgument(1, 1, -1, 0,
                299,
                0);

        // Line 58
        addInitialArgument(2, 0, 3, 0,
                294,
                0);

        // Line 59
        addInitialArgument(2, 0, -1, -2,
                0,
                8752);

        function addArgument(n1, n2, n3, n4, c1) {
            arg = calculateArgument(n1, n2, n3, n4);
            sigmaB += c1 * Math.sin(arg); // unit 0.000001 degree
        }

        // Chapter 45; Astronomical Algorithms; MEEUS, Jean; Pg. 311
        // Calculating sigmaB for Table 45.B

        // Line 1a
        addArgument(0, 0, 0, 1,
                5128122);

        // Line 1b
        addArgument(0, 0, 1, -3,
                777);

        // Line 2a
        addArgument(0, 0, 1, 1,
                280602);

        // Line 2b
        addArgument(4, 0, -2, 1,
                671);

        // Line 3a
        addArgument(0, 0, 1, -1,
                277693);

        // Line 3b
        addArgument(2, 0, 0, -3,
                607);

        // Line 4a
        addArgument(2, 0, 0, -1,
                173237);

        // Line 4b
        addArgument(2, 0, 2, -1,
                596);

        // Line 5a
        addArgument(2, 0, -1, 1,
                55413);

        // Line 5b
        addArgument(2, -1, 1, -1,
                491);

        // Line 6a
        addArgument(2, 0, -1, -1,
                46271);

        // Line 6b
        addArgument(2, 0, -2, 1,
                -451);

        // Line 7a
        addArgument(2, 0, 0, 1,
                32573);

        // Line 7b
        addArgument(0, 0, 3, -1,
                439);

        // Line 8a
        addArgument(0, 0, 2, 1,
                17198);

        // Line 8b
        addArgument(2, 0, 2, 1,
                422);

        // Line 9a
        addArgument(2, 0, 1, -1,
                9266);

        // Line 9b
        addArgument(2, 0, -3, -1,
                421);

        // Line 10a
        addArgument(0, 0, 2, -1,
                8822);

        // Line 10b
        addArgument(2, 1, -1, 1,
                -366);

        // Line 11a
        addArgument(2, -1, 0, -1,
                8216);

        // Line 11b
        addArgument(2, 1, 0, 1,
                -351);

        // Line 12a
        addArgument(2, 0, -2, -1,
                4324);

        // Line 12b
        addArgument(4, 0, 0, 1,
                331);

        // Line 13a
        addArgument(2, 0, 1, 1,
                4200);

        // Line 13b
        addArgument(2, -1, 1, 1,
                315);

        // Line 14a
        addArgument(2, 1, 0, -1,
                -3359);

        // Line 14b
        addArgument(2, -2, 0, -1,
                302);

        // Line 15a
        addArgument(2, -1, -1, 1,
                2463);

        // Line 15b
        addArgument(0, 0, 1, 3,
                -283);

        // Line 16a
        addArgument(2, -1, 0, 1,
                2211);

        // Line 16b
        addArgument(2, 1, 1, -1,
                -229);

        // Line 17a
        addArgument(2, -1, -1, -1,
                2065);

        // Line 17b
        addArgument(1, 1, 0, -1,
                223);

        // Line 18a
        addArgument(0, 1, -1, -1,
                -1870);

        // Line 18b
        addArgument(1, 1, 0, 1,
                223);

        // Line 19a
        addArgument(4, 0, -1, -1,
                1828);

        // Line 19b
        addArgument(0, 1, -2, -1,
                -220);

        // Line 20a
        addArgument(0, 1, 0, 1,
                -1794);

        // Line 20b
        addArgument(2, 1, -1, -1,
                -220);

        // Line 21a
        addArgument(0, 0, 0, 3,
                -1749);

        // Line 21b
        addArgument(1, 0, 1, 1,
                -185);

        // Line 22a
        addArgument(0, 1, -1, 1,
                -1565);

        // Line 22b
        addArgument(2, -1, -2, -1,
                181);

        // Line 23a
        addArgument(1, 0, 0, 1,
                -1491);

        // Line 23b
        addArgument(0, 1, 2, 1,
                -177);

        // Line 24a
        addArgument(0, 1, 1, 1,
                -1475);

        // Line 24b
        addArgument(4, 0, -2, -1,
                176);

        // Line 25a
        addArgument(0, 1, 1, -1,
                -1410);

        // Line 25b
        addArgument(4, -1, -1, -1,
                166);

        // Line 26a
        addArgument(0, 1, 0, -1,
                -1344);

        // Line 26b
        addArgument(1, 0, 1, -1,
                -164);

        // Line 27a
        addArgument(1, 0, 0, -1,
                -1335);

        // Line 27b
        addArgument(4, 0, 1, -1,
                132);

        // Line 28a
        addArgument(0, 0, 3, 1,
                1107);

        // Line 28b
        addArgument(1, 0, -1, -1,
                -119);

        // Line 29a
        addArgument(4, 0, 0, -1,
                1021);

        // Line 29b
        addArgument(4, -1, 0, -1,
                115);

        // Line 30a
        addArgument(4, 0, -1, 1,
                833);

        // Line 30b
        addArgument(2, -2, 0, 1,
                107);

        // Chapter 45; Astronomical Algorithms; MEEUS, Jean; Pg. 312
        // Additives to sigmaL and sigmaB
        sigmaL += 3958 * Math.sin(A1 * radian);
        sigmaL += 1962 * Math.sin((LDash - F) * radian);
        sigmaL += 318 * Math.sin(A2 * radian);

        sigmaB += -2235 * Math.sin(LDash * radian);
        sigmaB += 382 * Math.sin(A3 * radian);
        sigmaB += 175 * Math.sin((A1 - F) * radian);
        sigmaB += 175 * Math.sin((A1 + F) * radian);
        sigmaB += 127 * Math.sin((LDash - MDash) * radian);
        sigmaB += -115 * Math.sin((LDash + MDash) * radian);

        // getting ecliptic coordinates and distance from the center of the earth to the center of the moon
        var lambda = LDash + sigmaL / 1000000;
        var beta = sigmaB / 1000000;
        var delta = 385000.56 + sigmaR / 1000;
        var parallax = Math.asin(6378.14 / delta);

        return {
            longitude: lambda,
            latitude: beta,
            longitudeRadian: lambda * radian,
            latitudeRadian: beta * radian,
            horizontalParallax: parallax,
            distanceFromEarth: delta
        };
    };

    ON_DAED["ASTRO"].getSolarSystemEquatorialCoordinates = function (julian) {
        var moonPosition = this.getMoonPosition(julian);
        var sunPosition = this.getSolarCoordinates(julian);
        var obliquity = this.getEclipticObliquity(julian);
        var mercuryPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.MERCURY, julian, obliquity.nutation.longitudeRadian);
        var venusPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.VENUS, julian, obliquity.nutation.longitudeRadian);
        var marsPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.MARS, julian, obliquity.nutation.longitudeRadian);
        var jupiterPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.JUPITER, julian, obliquity.nutation.longitudeRadian);
        var saturnPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.SATURN, julian, obliquity.nutation.longitudeRadian);
        var uranusPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.URANUS, julian, obliquity.nutation.longitudeRadian);
        var neptunePosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.NEPTUNE, julian, obliquity.nutation.longitudeRadian);

        var transformOptions = {
            from: ON_DAED["ASTRO"].CoordinateType.ECLIPTIC,
            to: ON_DAED["ASTRO"].CoordinateType.EQUATORIAL,
            julian: julian,
            obliquity: obliquity.obliquityRadian
        };

        transformOptions.latitude = moonPosition.latitudeRadian;
        transformOptions.longitude = moonPosition.longitudeRadian;

        // getting moon horizontal coordinates
        var moonHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = sunPosition.latitudeRadian;
        transformOptions.longitude = sunPosition.longitudeRadian;

        var sunHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = mercuryPosition.latitudeRadian;
        transformOptions.longitude = mercuryPosition.longitudeRadian;

        var mercuryHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = venusPosition.latitudeRadian;
        transformOptions.longitude = venusPosition.longitudeRadian;

        var venusHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = marsPosition.latitudeRadian;
        transformOptions.longitude = marsPosition.longitudeRadian;

        var marsHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = jupiterPosition.latitudeRadian;
        transformOptions.longitude = jupiterPosition.longitudeRadian;

        var jupiterHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = saturnPosition.latitudeRadian;
        transformOptions.longitude = saturnPosition.longitudeRadian;

        var saturnHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = uranusPosition.latitudeRadian;
        transformOptions.longitude = uranusPosition.longitudeRadian;

        var uranusHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = neptunePosition.latitudeRadian;
        transformOptions.longitude = neptunePosition.longitudeRadian;

        var neptuneHorizontal = this.getTransformedCoordinates(transformOptions);

        moonHorizontal.R = moonPosition.distanceFromEarth / UA; // KM -> UA
        sunHorizontal.R = sunPosition.distanceFromEarth;
        mercuryHorizontal.R = mercuryPosition.distanceFromEarth;
        venusHorizontal.R = venusPosition.distanceFromEarth;
        marsHorizontal.R = marsPosition.distanceFromEarth;
        jupiterHorizontal.R = jupiterPosition.distanceFromEarth;
        saturnHorizontal.R = saturnPosition.distanceFromEarth;
        uranusHorizontal.R = uranusPosition.distanceFromEarth;
        neptuneHorizontal.R = neptunePosition.distanceFromEarth;

        return {
            moon: moonHorizontal,
            sun: sunHorizontal,
            mercury: mercuryHorizontal,
            venus: venusHorizontal,
            mars: marsHorizontal,
            jupiter: jupiterHorizontal,
            saturn: saturnHorizontal,
            uranus: uranusHorizontal,
            neptune: neptuneHorizontal
        };
    };

    ON_DAED["ASTRO"].getSolarSystemHorizontalCoordinates = function (julian, localLongitude, localLatitude) {
        var moonPosition = this.getMoonPosition(julian);
        var sunPosition = this.getSolarCoordinates(julian);
        var obliquity = this.getEclipticObliquity(julian);
        var mercuryPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.MERCURY, julian, obliquity.nutation.longitudeRadian);
        var venusPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.VENUS, julian, obliquity.nutation.longitudeRadian);
        var marsPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.MARS, julian, obliquity.nutation.longitudeRadian);
        var jupiterPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.JUPITER, julian, obliquity.nutation.longitudeRadian);
        var saturnPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.SATURN, julian, obliquity.nutation.longitudeRadian);
        var uranusPosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.URANUS, julian, obliquity.nutation.longitudeRadian);
        var neptunePosition = this.getSolarSystemBodyPosition(this.SolarSystemBody.NEPTUNE, julian, obliquity.nutation.longitudeRadian);

        var transformOptions = {
            from: ON_DAED["ASTRO"].CoordinateType.ECLIPTIC,
            to: ON_DAED["ASTRO"].CoordinateType.HORIZONTAL,
            localLatitude: localLatitude,
            localLongitude: localLongitude,
            julian: julian,
            obliquity: obliquity.obliquityRadian
        };

        transformOptions.latitude = moonPosition.latitudeRadian;
        transformOptions.longitude = moonPosition.longitudeRadian;

        // getting moon horizontal coordinates
        var moonHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = sunPosition.latitudeRadian;
        transformOptions.longitude = sunPosition.longitudeRadian;

        var sunHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = mercuryPosition.latitudeRadian;
        transformOptions.longitude = mercuryPosition.longitudeRadian;

        var mercuryHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = venusPosition.latitudeRadian;
        transformOptions.longitude = venusPosition.longitudeRadian;

        var venusHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = marsPosition.latitudeRadian;
        transformOptions.longitude = marsPosition.longitudeRadian;

        var marsHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = jupiterPosition.latitudeRadian;
        transformOptions.longitude = jupiterPosition.longitudeRadian;

        var jupiterHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = saturnPosition.latitudeRadian;
        transformOptions.longitude = saturnPosition.longitudeRadian;

        var saturnHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = uranusPosition.latitudeRadian;
        transformOptions.longitude = uranusPosition.longitudeRadian;

        var uranusHorizontal = this.getTransformedCoordinates(transformOptions);

        transformOptions.latitude = neptunePosition.latitudeRadian;
        transformOptions.longitude = neptunePosition.longitudeRadian;

        var neptuneHorizontal = this.getTransformedCoordinates(transformOptions);

        moonHorizontal.R = moonPosition.distanceFromEarth / UA; // KM -> UA
        sunHorizontal.R = sunPosition.distanceFromEarth;
        mercuryHorizontal.R = mercuryPosition.distanceFromEarth;
        venusHorizontal.R = venusPosition.distanceFromEarth;
        marsHorizontal.R = marsPosition.distanceFromEarth;
        jupiterHorizontal.R = jupiterPosition.distanceFromEarth;
        saturnHorizontal.R = saturnPosition.distanceFromEarth;
        uranusHorizontal.R = uranusPosition.distanceFromEarth;
        neptuneHorizontal.R = neptunePosition.distanceFromEarth;

        return {
            moon: moonHorizontal,
            sun: sunHorizontal,
            mercury: mercuryHorizontal,
            venus: venusHorizontal,
            mars: marsHorizontal,
            jupiter: jupiterHorizontal,
            saturn: saturnHorizontal,
            uranus: uranusHorizontal,
            neptune: neptuneHorizontal
        };
    };

    ON_DAED["ASTRO"].getEarthOrbitEccentricity = function (julian) {
        var T = this.getJulianCentury(julian);
        var e = 0.016708617 - 0.000042037 * T - 0.0000001236 * T * T;
        var pi = 102.93735 + 1.71953 * T + 0.00046 * T * T;
        return {
            e: e,
            pi: pi
        };
    };

    // 20.49552"
    var aberrationConstant = 20.49552 / 3600;

    ON_DAED["ASTRO"].getAberrationChanges = function (eclipticLongitude, eclipticLatitude, julian) {
        var T = this.getJulianCentury(julian);
        var eccentricity = this.getEarthOrbitEccentricity(julian);
        var e = eccentricity.e;
        var pi = eccentricity.pi;
        var solarLongitude = this.getSolarCoordinates(julian).longitude;

        var deltaLambda = (-aberrationConstant * Math.cos((solarLongitude - eclipticLongitude) * radian)
                + e * aberrationConstant * Math.cos((pi - eclipticLongitude) * radian)) /
                Math.cos(eclipticLatitude * radian);

        var deltaBeta = (-aberrationConstant * Math.sin(eclipticLatitude * radian) * (
                Math.sin((solarLongitude - eclipticLongitude) * radian) - e * Math.sin((pi - eclipticLongitude) * radian))
                );

        return {
            deltaLambda: deltaLambda,
            deltaBeta: deltaBeta,
            eccentricity: eccentricity
        };
    };

    ON_DAED["ASTRO"].getSolarSystemBodyPosition = function (body, julian, longitudeNutation) {
        // First method of getting solar system planets position;
        // Chapter 32; Page 209; Astronomical Algorithms; MEEUS, Jean

        var ret = null;
        if (body !== this.SolarSystemBody.EARTH) {
            var calculatedVSOP = VSOP87.D[body](julian);
            var R = calculatedVSOP.R;
            var B = calculatedVSOP.B;
            var L = calculatedVSOP.L;
            var calculatedEarthVSOP = VSOP87.D.earth(julian);
            var initR = calculatedEarthVSOP.R;
            var initL = calculatedEarthVSOP.L;
            var initB = calculatedEarthVSOP.B;

            var x = R * Math.cos(B) * Math.cos(L) -
                    initR * Math.cos(initB) * Math.cos(initL);
            var y = R * Math.cos(B) * Math.sin(L) -
                    initR * Math.cos(initB) * Math.sin(initL);
            var z = R * Math.sin(B) - initR * Math.sin(initB);

            var delta = Math.sqrt(x * x + y * y + z * z);
            var tau = 0.0057755183 * delta;

            var correctedEarthVSOP = VSOP87.D.earth(julian - tau);

            initR = correctedEarthVSOP.R;
            initB = correctedEarthVSOP.B;
            initL = correctedEarthVSOP.L;

            x = R * Math.cos(B) * Math.cos(L) -
                    initR * Math.cos(initB) * Math.cos(initL);
            y = R * Math.cos(B) * Math.sin(L) -
                    initR * Math.cos(initB) * Math.sin(initL);
            z = R * Math.sin(B) - initR * Math.sin(initB);

            delta = Math.sqrt(x * x + y * y + z * z);
            tau = 0.0057755183 * delta;

            var lambda = Math.atan2(y, x);
            var beta = Math.atan2(z, Math.sqrt(x * x + y * y));

            // FK5 Corrections
            lambda += -0.000025075;
            beta += 0.000015375;

            // in degrees
            if (!isNaN(longitudeNutation)) {
                lambda += parseFloat(longitudeNutation);
            }

            ret = {
                longitude: lambda * degree,
                latitude: beta * degree,
                longitudeRadian: lambda,
                latitudeRadian: beta,
                distanceFromEarth: delta
            };
        }

        return ret;
    };

    ON_DAED["ASTRO"].getSolarCoordinates = function (julian) {
        // Chapter 24; Astronomical Algorithms; MEEUS, Jean; Pg. 154
        var T = this.getJulianCentury(julian);

        var calculatedEarthVSOP = VSOP87.D.earth(julian);

        var sun = calculatedEarthVSOP.L * degree + 180;
        var beta = -calculatedEarthVSOP.B * degree;

        var lambdaDash = sun - 1.397 * T - 0.00031 * T * T;

        sun += 0.0933 / 3600;
        beta += (0.03916 / 3600) * (Math.cos(lambdaDash * radian) - Math.sin(lambdaDash * radian));

        var nutation = this.getEarthNutation(julian);
        var eccentricity = this.getEarthOrbitEccentricity(julian);

        sun += nutation.longitude;
        sun += -(aberrationConstant * (1 - eccentricity.e * eccentricity.e)) / calculatedEarthVSOP.R;

        var ret = {
            longitude: sun,
            longitudeRadian: sun * radian,
            latitude: beta,
            latitudeRadian: beta * radian,
            distanceFromEarth: calculatedEarthVSOP.R
        };

        return ret;
    };

})();